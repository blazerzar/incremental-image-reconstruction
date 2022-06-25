import { Reconstruction, Program } from "./Reconstruction";
import { WebGL } from "./WebGL";
import { getSource, getImage } from "./utils";

class Jacobi extends Reconstruction {
    /* Do one Jacobi iteration to update pixels. */
    protected update(): void {
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

        // Swap read and write buffers
        [this.colorDrawingRead, this.colorDrawingWrite] = [
            this.colorDrawingWrite,
            this.colorDrawingRead,
        ];
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
    const shaders = ["renderPoints", "jacobi/update", "renderToCanvas"];
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

    const jacobi = new Jacobi(gl, canvas, image, programs);
    jacobi.tick();
}

document.addEventListener("DOMContentLoaded", () => {
    main();
});
