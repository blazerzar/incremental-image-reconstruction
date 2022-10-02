import { Solver } from "./Solver";

export class Jacobi extends Solver {
    // Jacobi iteration parameter
    private weight: number;

    constructor(
        image: ImageData,
        size: number,
        reconstructionCanvas: HTMLCanvasElement,
        pointsCanvas: HTMLCanvasElement,
        residualCanvas: HTMLCanvasElement,
        weight: number
    ) {
        super(image, size, reconstructionCanvas, pointsCanvas, residualCanvas, [
            ["renderToCanvas.vert", "jacobi/update.frag"],
        ]);
        this.weight = weight;
    }

    protected update(): void {
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            this.reconstructionWrite.framebuffer
        );
        this.gl.viewport(0, 0, this.size, this.size);

        const { program, uniforms } = this.programs.get("jacobi/update");
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

        this.gl.uniform1i(uniforms.get("uF"), 2);
        this.gl.uniform1f(uniforms.get("uWeight"), this.weight);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        // Swap read and write buffers
        [this.reconstructionRead, this.reconstructionWrite] = [
            this.reconstructionWrite,
            this.reconstructionRead,
        ];
    }
}
