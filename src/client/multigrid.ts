import { Reconstruction, Program, Drawing } from "./Reconstruction";
import { WebGL } from "./WebGL";
import { getSource, getImage } from "./utils";

class Multigrid extends Reconstruction {
    private CYCLES = 3;

    /* Do one Multigrid iteration to update pixels. */
    protected update(): void {
        // Create texture and framebuffer for zero right hand side
        const fDrawing = this.createTexture(this.width, this.height);
        this.gl.deleteFramebuffer(fDrawing.framebuffer);
        const f = fDrawing.texture;

        [this.colorDrawingRead, this.colorDrawingWrite] = this.vCycle(
            this.colorDrawingRead,
            this.colorDrawingWrite,
            f,
            1
        );

        this.gl.deleteTexture(f);

        this.writeBoundary();
    }

    /* Use Jacobi iteration to draw points to color framebuffer */
    private writeBoundary(): void {
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            this.colorDrawingWrite.framebuffer
        );
        this.gl.viewport(0, 0, ...this.webgl.getDrawingBufferDims());

        const { program, uniforms } = this.programs.get("jacobi/update");
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorDrawingRead.texture);
        this.gl.uniform1i(uniforms.get("uColor"), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.pointsDrawing.texture);
        this.gl.uniform1i(uniforms.get("uPoints"), 1);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        [this.colorDrawingRead, this.colorDrawingWrite] = [
            this.colorDrawingWrite,
            this.colorDrawingRead,
        ];
    }

    private vCycle(
        phiRead: Drawing,
        phiWrite: Drawing,
        f: WebGLTexture,
        h: number
    ) {
        [phiRead, phiWrite] = this.smoothing(phiRead, phiWrite, f);

        const residualTexture = this.residual(phiRead.texture, f, h);

        const rhs = this.restriction(residualTexture, h);
        this.gl.deleteTexture(residualTexture);

        // Create texture and framebuffer for eps
        const currentWidth = Math.floor(this.width / h);
        const currentHeight = Math.floor(this.height / h);
        let epsRead = this.createTexture(
            Math.floor(currentWidth / 2),
            Math.floor(currentHeight / 2)
        );
        let epsWrite = this.createTexture(
            Math.floor(currentWidth / 2),
            Math.floor(currentHeight / 2)
        );

        // Smoothing or recursion
        if (Math.min(this.width, this.height) < 4 * h) {
            [epsRead, epsWrite] = this.smoothing(epsRead, epsWrite, rhs);
        } else {
            [epsRead, epsWrite] = this.vCycle(epsRead, epsWrite, rhs, 2 * h);
        }

        this.gl.deleteTexture(rhs);

        // Prolongation and correction
        [phiRead, phiWrite] = this.prolongation(
            phiRead,
            phiWrite,
            epsRead.texture
        );

        this.gl.deleteTexture(epsRead.texture);
        this.gl.deleteTexture(epsWrite.texture);
        this.gl.deleteFramebuffer(epsRead.framebuffer);
        this.gl.deleteFramebuffer(epsWrite.framebuffer);

        [phiRead, phiWrite] = this.smoothing(phiRead, phiWrite, f);

        return [phiRead, phiWrite];
    }

    private smoothing(
        phiRead: Drawing,
        phiWrite: Drawing,
        f: WebGLTexture
    ): [Drawing, Drawing] {
        for (let i = 0; i < this.CYCLES; ++i) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, phiWrite.framebuffer);
            this.gl.viewport(0, 0, ...this.webgl.getDrawingBufferDims());

            const { program, uniforms } = this.programs.get(
                "multigrid/smoothing"
            );
            this.gl.useProgram(program);

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, phiRead.texture);
            this.gl.uniform1i(uniforms.get("uColor"), 0);

            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, f);
            this.gl.uniform1i(uniforms.get("uRightHandSide"), 1);

            this.gl.bindVertexArray(this.clipVao);
            this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

            // Swap read and write buffers
            [phiRead, phiWrite] = [phiWrite, phiRead];
        }

        return [phiRead, phiWrite];
    }

    private residual(phiRead: WebGLTexture, f: WebGLTexture, h: number) {
        // Create texture and framebuffer for the residual
        const { texture, framebuffer } = this.createTexture(
            Math.floor(this.width / h),
            Math.floor(this.height / h)
        );

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
        this.gl.viewport(0, 0, ...this.webgl.getDrawingBufferDims());

        const { program, uniforms } = this.programs.get("multigrid/residual");
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, phiRead);
        this.gl.uniform1i(uniforms.get("uColor"), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, f);
        this.gl.uniform1i(uniforms.get("uRightHandSide"), 1);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        this.gl.deleteFramebuffer(framebuffer);
        return texture;
    }

    private restriction(
        residualTexture: WebGLTexture,
        h: number
    ): WebGLTexture {
        const currentWidth = Math.floor(this.width / h);
        const currentHeight = Math.floor(this.height / h);

        // Create new smaller texture
        const { texture, framebuffer } = this.createTexture(
            Math.floor(currentWidth / 2),
            Math.floor(currentHeight / 2)
        );

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
        this.gl.viewport(0, 0, ...this.webgl.getDrawingBufferDims());

        const { program, uniforms } = this.programs.get(
            "multigrid/restriction"
        );
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, residualTexture);
        this.gl.uniform1i(uniforms.get("uColor"), 0);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        this.gl.deleteFramebuffer(framebuffer);
        return texture;
    }

    private prolongation(
        phiRead: Drawing,
        phiWrite: Drawing,
        eps: WebGLTexture
    ) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, phiWrite.framebuffer);
        this.gl.viewport(0, 0, ...this.webgl.getDrawingBufferDims());

        const { program, uniforms } = this.programs.get(
            "multigrid/prolongation"
        );
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, phiRead.texture);
        this.gl.uniform1i(uniforms.get("uColor"), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, eps);
        this.gl.uniform1i(uniforms.get("uEps"), 1);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        return [phiWrite, phiRead];
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
    const shaders = [
        "renderPoints",
        "jacobi/update",
        "multigrid/smoothing",
        "multigrid/residual",
        "multigrid/restriction",
        "multigrid/prolongation",
        "renderToCanvas",
    ];
    for (const shader of shaders) {
        const vert = await getSource(`shaders/${shader}.vert`);
        const frag = await getSource(`shaders/${shader}.frag`);

        const vertShader = webgl.createShader(vert, gl.VERTEX_SHADER);
        const fragShader = webgl.createShader(frag, gl.FRAGMENT_SHADER);
        const { program, attributes, uniforms } = webgl.createProgram([
            vertShader,
            fragShader,
        ]);

        programs.set(shader, { program, attributes, uniforms });
    }

    const multigrid = new Multigrid(gl, canvas, image, programs);
    multigrid.tick();
}

document.addEventListener("DOMContentLoaded", () => {
    main();
});
