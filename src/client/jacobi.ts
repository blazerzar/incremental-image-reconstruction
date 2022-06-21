import { WebGL } from "./WebGL";
import { getSource, getImage } from "./utils";

type Program = {
    program: WebGLProgram;
    attributes: Map<string, number>;
    uniforms: Map<string, WebGLUniformLocation>;
};

class Jacobi {
    // Inputs
    private gl: WebGL2RenderingContext;
    private webgl: WebGL;
    private width: number;
    private height: number;
    private image: ImageData;
    private programs: Map<string, Program>;

    // User interaction
    private mouseX: number;
    private mouseY: number;
    private mousePressed: boolean;

    // Textures
    private pointsTexture: WebGLTexture;
    private colorTextureRead: WebGLTexture;
    private colorTextureWrite: WebGLTexture;
    private pointsFramebuffer: WebGLFramebuffer;
    private colorFramebufferRead: WebGLFramebuffer;
    private colorFramebufferWrite: WebGLFramebuffer;

    // Buffers
    private pointsVao: WebGLVertexArrayObject;
    private clipVao: WebGLVertexArrayObject;
    private pointsBuffer: WebGLBuffer;

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

        // Create textures
        const textureOptions = {
            width: this.width,
            height: this.height,
            format: this.gl.RGBA,
            internalFormat: this.gl.RGBA32F,
            type: this.gl.FLOAT,
            wrapS: this.gl.CLAMP_TO_EDGE,
            wrapT: this.gl.CLAMP_TO_EDGE,
            min: this.gl.NEAREST,
            mag: this.gl.NEAREST,
        };
        this.pointsTexture = this.webgl.createTexture(textureOptions);
        this.pointsFramebuffer = this.webgl.createFramebuffer({
            color: [this.pointsTexture],
        });
        this.colorTextureRead = this.webgl.createTexture(textureOptions);
        this.colorFramebufferRead = this.webgl.createFramebuffer({
            color: [this.colorTextureRead],
        });
        this.colorTextureWrite = this.webgl.createTexture(textureOptions);
        this.colorFramebufferWrite = this.webgl.createFramebuffer({
            color: [this.colorTextureWrite],
        });

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
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pointsFramebuffer);
        this.gl.viewport(0, 0, this.width, this.height);

        const { program } = this.programs.get("renderPoints");
        this.gl.useProgram(program);

        this.gl.bindVertexArray(this.pointsVao);
        this.gl.drawArrays(this.gl.POINTS, 0, pointsCount);
    }

    /* Do one Jacobi iteration to update pixels. */
    private update(): void {
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            this.colorFramebufferWrite
        );
        this.gl.viewport(0, 0, this.width, this.height);

        const { program, uniforms } = this.programs.get("jacobiUpdate");
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorTextureRead);
        this.gl.uniform1i(uniforms.get("uColor"), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.pointsTexture);
        this.gl.uniform1i(uniforms.get("uPoints"), 1);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        // Swap read and write buffers
        [this.colorTextureRead, this.colorTextureWrite] = [
            this.colorTextureWrite,
            this.colorTextureRead,
        ];
        [this.colorFramebufferRead, this.colorFramebufferWrite] = [
            this.colorFramebufferWrite,
            this.colorFramebufferRead,
        ];
    }

    /* Draw pixels into the canvas. */
    private render(): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(
            0,
            0,
            this.gl.drawingBufferWidth,
            this.gl.drawingBufferHeight
        );

        const { program, uniforms } = this.programs.get("renderToCanvas");
        this.gl.useProgram(program);

        // Draw pixels from texture to canvas
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorTextureRead);
        this.gl.uniform1i(uniforms.get("uColor"), 0);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }
}

async function main() {
    const image = await getImage("images/cat.jpg");

    // Get canvas
    const canvas = document.querySelector("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    // Get WebGL context and set setting
    const gl = canvas.getContext("webgl2", {
        alpha: false,
        depth: false,
        stencil: false,
        desynchronized: true,
        antialias: false,
        preserveDrawingBuffer: true,
    });
    gl.getExtension("OES_texture_float_linear");
    gl.getExtension("EXT_color_buffer_float");

    const webgl = new WebGL(gl);

    // Read shaders source files and create programs
    const programs = new Map<string, Program>();
    for (const shaders of ["renderPoints", "jacobiUpdate", "renderToCanvas"]) {
        const vert = await getSource(`shaders/${shaders}.vert`);
        const frag = await getSource(`shaders/${shaders}.frag`);

        const vertShader = webgl.createShader(vert, gl.VERTEX_SHADER);
        const fragShader = webgl.createShader(frag, gl.FRAGMENT_SHADER);
        const { program, attributes, uniforms } = webgl.createProgram([
            vertShader,
            fragShader,
        ]);

        programs.set(shaders, { program, attributes, uniforms });
    }

    const jacobi = new Jacobi(gl, canvas, image, programs);
    jacobi.tick();
}

document.addEventListener("DOMContentLoaded", () => {
    main();
});
