import { Drawing, Solver } from "./Solver";

export class ConjugateGradient extends Solver {
    // Conjugate gradient state
    residualCurr: Drawing;
    residualNext: Drawing;
    conjugateGradientCurr: Drawing;
    conjugateGradientNext: Drawing;
    cgTempDrawing: Drawing;
    newPoints: boolean;

    constructor(
        image: ImageData,
        size: number,
        reconstructionCanvas: HTMLCanvasElement,
        pointsCanvas: HTMLCanvasElement,
        residualCanvas: HTMLCanvasElement
    ) {
        super(image, size, reconstructionCanvas, pointsCanvas, residualCanvas, [
            ["renderToCanvas.vert", "conjugateGradient/laplacian.frag"],
            ["renderToCanvas.vert", "conjugateGradient/update.frag"],
        ]);
        this.newPoints = false;
    }

    protected initDrawings(): void {
        super.initDrawings();
        this.residualCurr = this.createDrawing(this.size);
        this.residualNext = this.createDrawing(this.size);
        this.conjugateGradientCurr = this.createDrawing(this.size);
        this.conjugateGradientNext = this.createDrawing(this.size);
        this.cgTempDrawing = this.createDrawing(this.size);
    }

    protected renderPoints(pointsCount: number): void {
        super.renderPoints(pointsCount);

        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            this.reconstructionRead.framebuffer
        );
        this.gl.viewport(0, 0, this.size, this.size);

        const { program } = this.programs.get("renderPoints");
        this.gl.useProgram(program);

        this.gl.bindVertexArray(this.pointsVao);
        this.gl.drawArrays(this.gl.POINTS, 0, pointsCount);

        this.newPoints = true;
    }

    protected update(): void {
        // If new points are added, state needs to be restarted
        if (this.newPoints) {
            this.restartState();
            this.newPoints = false;
        }

        this.laplacian(this.conjugateGradientCurr, this.cgTempDrawing);
        const a = this.dotProduct(this.residualCurr, this.residualCurr);
        const b = this.dotProduct(
            this.conjugateGradientCurr,
            this.cgTempDrawing
        );

        if ((b.reduce((acc, n) => acc * n, 1) || 0) === 0) {
            return;
        }

        const alpha = a.map((n, i) => n / b[i]);
        this._update(
            this.reconstructionRead,
            this.conjugateGradientCurr,
            this.reconstructionWrite,
            alpha
        );
        this._update(
            this.residualCurr,
            this.cgTempDrawing,
            this.residualNext,
            alpha.map((n) => -n)
        );

        const c = this.dotProduct(this.residualNext, this.residualNext);
        const beta = c.map((n, i) => n / a[i]);
        this._update(
            this.residualNext,
            this.conjugateGradientCurr,
            this.conjugateGradientNext,
            beta
        );

        [this.residualCurr, this.residualNext] = [
            this.residualNext,
            this.residualCurr,
        ];
        [this.conjugateGradientCurr, this.conjugateGradientNext] = [
            this.conjugateGradientNext,
            this.conjugateGradientCurr,
        ];
        [this.reconstructionRead, this.reconstructionWrite] = [
            this.reconstructionWrite,
            this.reconstructionRead,
        ];
    }

    private restartState(): void {
        this.residual(
            this.residualCurr,
            this.reconstructionRead,
            this.pointsDrawing,
            this.fDrawing,
            this.size
        );

        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            this.residualCurr.framebuffer
        );
        this.gl.bindTexture(
            this.gl.TEXTURE_2D,
            this.conjugateGradientCurr.texture
        );

        this.gl.copyTexImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA32F,
            0,
            0,
            this.size,
            this.size,
            0
        );
    }

    private laplacian(read: Drawing, write: Drawing): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, write.framebuffer);
        this.gl.viewport(0, 0, this.size, this.size);

        const { program, uniforms } = this.programs.get(
            "conjugateGradient/laplacian"
        );
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, read.texture);
        this.gl.uniform1i(uniforms.get("uImage"), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.pointsDrawing.texture);
        this.gl.uniform1i(uniforms.get("uPoints"), 1);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    /* Write lhs + alpha * rhs to write framebuffer. */
    private _update(
        lhs: Drawing,
        rhs: Drawing,
        write: Drawing,
        alpha: Float32Array
    ): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, write.framebuffer);
        this.gl.viewport(0, 0, this.size, this.size);

        const { program, uniforms } = this.programs.get(
            "conjugateGradient/update"
        );
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, lhs.texture);
        this.gl.uniform1i(uniforms.get("uImageA"), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, rhs.texture);
        this.gl.uniform1i(uniforms.get("uImageB"), 1);

        this.gl.uniform1f(uniforms.get("uR"), alpha[0]);
        this.gl.uniform1f(uniforms.get("uG"), alpha[1]);
        this.gl.uniform1f(uniforms.get("uB"), alpha[2]);
        this.gl.uniform1f(uniforms.get("uA"), alpha[3]);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }
}
