import { WebGL, Program } from "./WebGL";
import { getSource } from "./utils";

export type Drawing = {
    texture: WebGLTexture;
    framebuffer: WebGLFramebuffer;
};

export abstract class Solver {
    private running = true;

    // Inputs
    private image: ImageData;
    protected size: number;

    // Canvas and WebGL context for drawing
    private canvas: HTMLCanvasElement;
    protected gl: WebGL2RenderingContext;
    protected webgl: WebGL;
    protected programs: Map<string, Program>;

    // WebGL contexts for web page canvases
    private reconstructionCanvas: HTMLCanvasElement;
    private reconstructionContext: CanvasRenderingContext2D;
    private pointsContext: CanvasRenderingContext2D;
    private residualContext: CanvasRenderingContext2D;

    // User interaction
    private mouseX: number;
    private mouseY: number;
    private mousePressed: boolean;

    // Drawings that contain textures and framebuffers
    protected pointsDrawing: Drawing;
    protected reconstructionRead: Drawing;
    protected reconstructionWrite: Drawing;
    protected residualDrawing: Drawing;
    protected fDrawing: Drawing;

    // Used for dot product calculation
    private level: number;
    private sumFramebuffer: WebGLFramebuffer;
    protected tempDrawing: Drawing;

    // Buffers
    protected pointsVao: WebGLVertexArrayObject;
    protected clipVao: WebGLVertexArrayObject;
    protected pointsBuffer: WebGLBuffer;

    // Programs used by all solvers
    protected solverPrograms: Array<[string, string]> = [
        ["renderPoints.vert", "renderPoints.frag"],
        ["renderToCanvas.vert", "renderToCanvas.frag"],
        ["renderToCanvas.vert", "renderResidual.frag"],
        ["renderToCanvas.vert", "residual.frag"],
        ["renderToCanvas.vert", "dotProduct.frag"],
    ];

    // Time measurements
    private prevTime: number;
    private currMean = 0;
    private iters = 0;

    constructor(
        image: ImageData,
        size: number,
        reconstructionCanvas: HTMLCanvasElement,
        pointsCanvas: HTMLCanvasElement,
        residualCanvas: HTMLCanvasElement,
        additionalPrograms?: Array<[string, string]>
    ) {
        this.image = image;
        this.size = size;

        this.canvas = document.createElement("canvas");
        this.canvas.width = 3 * size;
        this.canvas.height = size;
        this.gl = this.canvas.getContext("webgl2", {
            alpha: false,
            depth: false,
            stencil: false,
            desynchronized: true,
            antialias: false,
            preserveDrawingBuffer: true,
        });
        this.gl.getExtension("OES_texture_float_linear");
        this.gl.getExtension("EXT_color_buffer_float");
        this.webgl = new WebGL(this.gl);

        this.reconstructionCanvas = reconstructionCanvas;
        this.reconstructionContext = reconstructionCanvas.getContext("2d");
        this.pointsContext = pointsCanvas.getContext("2d");
        this.residualContext = residualCanvas.getContext("2d");

        if (additionalPrograms !== undefined) {
            this.solverPrograms.push(...additionalPrograms);
        }

        this.initUserInteraction(reconstructionCanvas);
        this.initBuffers();
        this.initDrawings();
        this.initPrograms();

        this.level = Math.log2(this.size);
        this.sumFramebuffer = this.gl.createFramebuffer();
    }

    private initUserInteraction(canvas: HTMLCanvasElement): void {
        canvas.onmousedown = (e) => {
            this.mousePressed = e.button === 0;
        };
        window.onmouseup = (e) => {
            this.mousePressed &&= e.button !== 0;
        };
        window.onmousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouseX = (e.clientX - rect.x) / rect.width;
            this.mouseY = (e.clientY - rect.y) / rect.height;
        };
    }

    private initBuffers(): void {
        this.pointsVao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.pointsVao);
        this.pointsBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.pointsBuffer);
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 24, 0);
        this.gl.enableVertexAttribArray(1);
        this.gl.vertexAttribPointer(1, 4, this.gl.FLOAT, false, 24, 8);

        this.clipVao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.clipVao);
        this.webgl.createClipQuad();
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);
    }

    protected initDrawings(): void {
        this.pointsDrawing = this.createDrawing(this.size);
        this.reconstructionRead = this.createDrawing(this.size);
        this.reconstructionWrite = this.createDrawing(this.size);
        this.residualDrawing = this.createDrawing(this.size);
        this.fDrawing = this.createDrawing(this.size);
        this.tempDrawing = this.createDrawing(this.size);
    }

    protected createDrawing(size: number): Drawing {
        const textureOptions = {
            width: size,
            height: size,
            format: this.gl.RGBA,
            internalFormat: this.gl.RGBA32F,
            type: this.gl.FLOAT,
            wrapS: this.gl.CLAMP_TO_EDGE,
            wrapT: this.gl.CLAMP_TO_EDGE,
            min: this.gl.LINEAR,
            mag: this.gl.LINEAR,
        };

        const texture = this.webgl.createTexture(textureOptions);
        const framebuffer = this.webgl.createFramebuffer({
            color: [texture],
        });

        return { texture, framebuffer };
    }

    protected async initPrograms(): Promise<void> {
        await this.createPrograms(this.solverPrograms);
        this.tick();
    }

    protected async createPrograms(
        programs: Array<[string, string]>
    ): Promise<Map<string, WebGLShader>> {
        const shaderFiles = new Set<string>();
        for (const prog of programs) {
            const [vert, frag] = prog;
            shaderFiles.add(vert);
            shaderFiles.add(frag);
        }

        // Compile shaders
        const shaders = new Map<string, WebGLShader>();
        for (const shader of shaderFiles) {
            const source = await getSource(`shaders/${shader}`);
            const type = shader.endsWith(".vert")
                ? this.gl.VERTEX_SHADER
                : this.gl.FRAGMENT_SHADER;

            shaders.set(shader, this.webgl.createShader(source, type));
        }

        // Create programs from compiled shaders
        this.programs = new Map<string, Program>();
        for (const prog of programs) {
            const [vert, frag] = prog;
            const vertShader = shaders.get(vert);
            const fragShader = shaders.get(frag);

            this.programs.set(
                frag.split(".")[0],
                this.webgl.createProgram([vertShader, fragShader])
            );
        }

        return shaders;
    }

    protected tick(): void {
        if (this.running) {
            this.addPoints();
            this.update();
            this.calculateResidual();

            const currTime = Date.now();
            if (this.prevTime !== undefined) {
                const elapsed = currTime - this.prevTime;
                this.currMean =
                    (this.currMean * this.iters + elapsed) / (this.iters + 1);
                ++this.iters;
            }
            this.prevTime = currTime;
            // console.log(this.currMean);

            this.render();

            // this.residual(
            //     this.residualDrawing,
            //     this.reconstructionRead,
            //     this.pointsDrawing,
            //     this.fDrawing,
            //     this.size
            // );

            // const residualNorm = this.dotProduct(
            //     this.residualDrawing,
            //     this.residualDrawing
            // );
            // console.log(
            //     residualNorm
            //         .map((v) => Math.sqrt(v / (this.size * this.size)))
            //         .slice(0, -1)
            //         .reduce((acc, v) => acc + v, 0) / 4
            // );

            requestAnimationFrame(this.tick.bind(this));
        }
    }

    /* Add points from the original image on user click as boundary. */
    private addPoints(): void {
        if (!this.mousePressed) {
            return;
        }

        function randNorm(mu: number, sigma: number): number {
            const u1 = Math.random();
            const u2 = Math.random();
            const norm =
                Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return norm * sigma + mu;
        }

        // Generate [pointsCount] random points around the cursor
        const points = [];
        const pointsCount = 10;

        for (let i = 0; i < pointsCount; ++i) {
            const x = randNorm(this.mouseX, 0.1);
            const y = randNorm(this.mouseY, 0.1);

            // Transform from [0, 1] to [-1, 1]
            points.push(x * 2 - 1, -(y * 2 - 1));

            const pixelX = Math.floor(x * this.size);
            const pixelY = Math.floor(y * this.size);
            const pixelIndex = (pixelX + pixelY * this.size) * 4;

            points.push(
                this.image.data[pixelIndex] / 255,
                this.image.data[pixelIndex + 1] / 255,
                this.image.data[pixelIndex + 2] / 255,
                this.image.data[pixelIndex + 3] / 255
            );
        }

        // Move points to GPU
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.pointsBuffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(points),
            this.gl.DYNAMIC_DRAW
        );

        // Render new points to points framebuffer
        this.renderPoints(pointsCount);
    }

    /* Render new points to points framebuffer. */
    protected renderPoints(pointsCount: number): void {
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            this.pointsDrawing.framebuffer
        );
        this.gl.viewport(0, 0, this.size, this.size);

        const { program } = this.programs.get("renderPoints");
        this.gl.useProgram(program);

        this.gl.bindVertexArray(this.pointsVao);
        this.gl.drawArrays(this.gl.POINTS, 0, pointsCount);
    }

    /* Do one iteration to update the image. */
    protected abstract update(): void;

    /* Calcualte residual. */
    private calculateResidual(): void {
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            this.residualDrawing.framebuffer
        );
        this.gl.viewport(0, 0, this.size, this.size);

        const { program, uniforms } = this.programs.get("renderResidual");
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(
            this.gl.TEXTURE_2D,
            this.reconstructionRead.texture
        );
        this.gl.uniform1i(uniforms.get("uReconstruction"), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.pointsDrawing.texture);
        this.gl.uniform1i(uniforms.get("uPoints"), 1);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    /* Draw all three canvases. */
    private render(): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        const { program, uniforms } = this.programs.get("renderToCanvas");
        this.gl.useProgram(program);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.uniform1i(uniforms.get("uColor"), 0);
        this.gl.bindVertexArray(this.clipVao);

        // Render 3 framebuffers next to each other on one canvas
        this.renderToCanvas(
            this.reconstructionRead,
            this.reconstructionContext,
            0
        );
        this.gl.viewport(this.size, 0, this.size, this.size);
        this.renderToCanvas(this.pointsDrawing, this.pointsContext, 1);
        this.renderToCanvas(this.residualDrawing, this.residualContext, 2);
    }

    /* Copy canvas with index [index] to canvas on the web page. */
    private renderToCanvas(
        drawing: Drawing,
        context: CanvasRenderingContext2D,
        index: number
    ): void {
        const s = this.size;
        const texture = drawing.texture;

        this.gl.viewport(index * s, 0, s, s);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
        context.drawImage(this.canvas, index * s, 0, s, s, 0, 0, s, s);
    }

    /* Calculate residual for current solution. */
    protected residual(
        residualDrawing: Drawing,
        reconstructionRead: Drawing,
        pointsDrawing: Drawing,
        fDrawing: Drawing,
        size: number
    ): void {
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            residualDrawing.framebuffer
        );
        this.gl.viewport(0, 0, size, size);

        const { program, uniforms } = this.programs.get("residual");
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, reconstructionRead.texture);
        this.gl.uniform1i(uniforms.get("uReconstruction"), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, pointsDrawing.texture);
        this.gl.uniform1i(uniforms.get("uPoints"), 1);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, fDrawing.texture);
        this.gl.uniform1i(uniforms.get("uF"), 2);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    /* Clear all framebuffers, textures and programs. */
    public free(): void {
        this.reconstructionCanvas.onmousedown = null;
        window.onmouseup = null;
        window.onmousemove = null;

        for (const program of this.programs) {
            this.gl.deleteProgram(program[1].program);
        }

        for (const drawing of [
            this.pointsDrawing,
            this.reconstructionRead,
            this.reconstructionWrite,
            this.residualDrawing,
            this.fDrawing,
            this.tempDrawing,
        ]) {
            this.gl.deleteTexture(drawing.texture);
            this.gl.deleteFramebuffer(drawing.framebuffer);
        }
        this.gl.deleteFramebuffer(this.sumFramebuffer);

        this.gl.deleteVertexArray(this.pointsVao);
        this.gl.deleteVertexArray(this.clipVao);
        this.gl.deleteBuffer(this.pointsBuffer);

        this.running = false;
    }

    protected dotProduct(left: Drawing, right: Drawing): Float32Array {
        // Multiply left and right hand side elementwise
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            this.tempDrawing.framebuffer
        );
        this.gl.viewport(0, 0, this.size, this.size);

        const { program, uniforms } = this.programs.get("dotProduct");
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, left.texture);
        this.gl.uniform1i(uniforms.get("uLeft"), 0);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, right.texture);
        this.gl.uniform1i(uniforms.get("uRight"), 1);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.sumFramebuffer);
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            this.tempDrawing.texture,
            this.level
        );
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.tempDrawing.texture);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);

        const result = new Float32Array(4);
        this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.FLOAT, result);

        return result.map((v) => v * this.size * this.size);
    }
}
