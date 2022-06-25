import { WebGL } from "./WebGL";

export type Program = {
    program: WebGLProgram;
    attributes: Map<string, number>;
    uniforms: Map<string, WebGLUniformLocation>;
};

export type Drawing = {
    texture: WebGLTexture;
    framebuffer: WebGLFramebuffer;
};

export abstract class Reconstruction {
    // Inputs
    protected gl: WebGL2RenderingContext;
    protected webgl: WebGL;
    protected width: number;
    protected height: number;
    private image: ImageData;
    protected programs: Map<string, Program>;

    // User interaction
    private mouseX: number;
    private mouseY: number;
    private mousePressed: boolean;

    // Drawings that contain textures and framebuffers
    protected pointsDrawing: Drawing;
    protected colorDrawingRead: Drawing;
    protected colorDrawingWrite: Drawing;

    // Buffers
    protected pointsVao: WebGLVertexArrayObject;
    protected clipVao: WebGLVertexArrayObject;
    protected pointsBuffer: WebGLBuffer;

    constructor(
        gl: WebGL2RenderingContext,
        canvas: HTMLCanvasElement,
        image: ImageData,
        programs: Map<string, Program>
    ) {
        this.gl = gl;
        this.webgl = new WebGL(gl);
        this.width = image.width;
        this.height = image.height;
        this.image = image;
        this.programs = programs;

        // Add event listeners for user interaction
        canvas.addEventListener("mousedown", (e) => {
            this.mousePressed = e.button === 0;
        });
        window.addEventListener("mouseup", (e) => {
            this.mousePressed = e.button === 0 ? false : this.mousePressed;
        });
        window.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouseX = (e.clientX - rect.x) / rect.width;
            this.mouseY = (e.clientY - rect.y) / rect.height;
        });

        // Create textures and framebuffers

        this.pointsDrawing = this.createTexture(this.width, this.height);
        this.colorDrawingRead = this.createTexture(this.width, this.height);
        this.colorDrawingWrite = this.createTexture(this.width, this.height);

        // Create buffers
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

    public tick(): void {
        this.addPoints();
        this.update();
        this.render();
        requestAnimationFrame(this.tick.bind(this));
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

            const pixelX = Math.floor(x * this.width);
            const pixelY = Math.floor(y * this.height);
            const pixelIndex = (pixelX + pixelY * this.width) * 4;

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

    private renderPoints(pointsCount: number): void {
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            this.pointsDrawing.framebuffer
        );
        this.gl.viewport(0, 0, this.width, this.height);

        const { program } = this.programs.get("renderPoints");
        this.gl.useProgram(program);

        this.gl.bindVertexArray(this.pointsVao);
        this.gl.drawArrays(this.gl.POINTS, 0, pointsCount);
    }

    /* Do one iteration to update pixels. */
    protected abstract update(): void;

    /* Draw pixels into the canvas. */
    private render(): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, ...this.webgl.getDrawingBufferDims());

        const { program, uniforms } = this.programs.get("renderToCanvas");
        this.gl.useProgram(program);

        // Draw pixels from texture to canvas
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorDrawingRead.texture);
        this.gl.uniform1i(uniforms.get("uColor"), 0);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    protected createTexture(width: number, height: number): Drawing {
        const textureOptions = {
            width: width,
            height: height,
            format: this.gl.RGBA,
            internalFormat: this.gl.RGBA32F,
            type: this.gl.FLOAT,
            wrapS: this.gl.CLAMP_TO_EDGE,
            wrapT: this.gl.CLAMP_TO_EDGE,
            min: this.gl.NEAREST,
            mag: this.gl.LINEAR,
        };

        const texture = this.webgl.createTexture(textureOptions);
        const framebuffer = this.webgl.createFramebuffer({
            color: [texture],
        });

        return { texture, framebuffer };
    }
}
