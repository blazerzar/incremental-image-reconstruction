import { Solver } from "./Solver";

export class SuccessiveOverRelaxation extends Solver {
    // SOR iteration parameter
    private omega: number;

    constructor(
        image: ImageData,
        size: number,
        reconstructionCanvas: HTMLCanvasElement,
        pointsCanvas: HTMLCanvasElement,
        residualCanvas: HTMLCanvasElement,
        omega = 1.9
    ) {
        super(image, size, reconstructionCanvas, pointsCanvas, residualCanvas, [
            ["renderToCanvas.vert", "sor/updateRedBlack.frag"],
        ]);
        this.omega = omega;
    }

    protected update(): void {
        this.updateColor(0);
        this.updateColor(1);
    }

    private updateColor(color: 0 | 1): void {
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            this.reconstructionWrite.framebuffer
        );
        this.gl.viewport(0, 0, this.size, this.size);

        const { program, uniforms } = this.programs.get("sor/updateRedBlack");
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
        this.gl.uniform1i(uniforms.get("uRedBlack"), color);
        this.gl.uniform1f(uniforms.get("uOmega"), this.omega);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        // Swap read and write buffers
        [this.reconstructionRead, this.reconstructionWrite] = [
            this.reconstructionWrite,
            this.reconstructionRead,
        ];
    }
}
