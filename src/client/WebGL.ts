export type Program = {
    program: WebGLProgram;
    attributes: Map<string, number>;
    uniforms: Map<string, WebGLUniformLocation>;
};
export class WebGL {
    private gl: WebGL2RenderingContext;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
    }

    /* Create shader of type [type] using source code in [source]. */
    public createShader(source: string, type: number): WebGLShader {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            throw new Error("Cannot compile shader\nInfo log:\n" + info);
        }

        return shader;
    }

    /* Create program using shaders in [shaders]. */
    public createProgram(shaders: WebGLShader[]): Program {
        const program = this.gl.createProgram();
        for (const shader of shaders) {
            this.gl.attachShader(program, shader);
        }

        this.gl.linkProgram(program);
        const status = this.gl.getProgramParameter(
            program,
            this.gl.LINK_STATUS
        );
        if (!status) {
            const info = this.gl.getProgramInfoLog(program);
            throw new Error("Cannot link program\nInfo log:\n" + info);
        }

        const attributes = new Map<string, number>();
        const activeAttributes = this.gl.getProgramParameter(
            program,
            this.gl.ACTIVE_ATTRIBUTES
        );
        for (let i = 0; i < activeAttributes; ++i) {
            const info = this.gl.getActiveAttrib(program, i);
            attributes.set(
                info.name,
                this.gl.getAttribLocation(program, info.name)
            );
        }

        const uniforms = new Map<string, WebGLUniformLocation>();
        const activeUniforms = this.gl.getProgramParameter(
            program,
            this.gl.ACTIVE_UNIFORMS
        );
        for (let i = 0; i < activeUniforms; i++) {
            const info = this.gl.getActiveUniform(program, i);
            uniforms.set(
                info.name,
                this.gl.getUniformLocation(program, info.name)
            );
        }

        return { program, attributes, uniforms };
    }

    /* Create texture using options or default values. */
    public createTexture({
        target,
        internalFormat,
        format,
        type,
        texture,
        unit,
        image,
        width,
        height,
        depth,
        wrapS,
        wrapT,
        wrapR,
        min,
        mag,
        mip,
    }: TextureOptions): WebGLTexture {
        target = target || this.gl.TEXTURE_2D;
        internalFormat = internalFormat || this.gl.RGBA;
        format = format || this.gl.RGBA;
        type = type || this.gl.UNSIGNED_BYTE;
        texture = texture || this.gl.createTexture();

        if (unit) {
            this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        }
        this.gl.bindTexture(target, texture);

        if (image) {
            // Load image
            this.gl.texImage2D(
                target,
                0,
                internalFormat,
                width,
                height,
                0,
                format,
                type,
                image
            );
        } else {
            // Allocate space
            if (target === this.gl.TEXTURE_3D) {
                this.gl.texImage3D(
                    target,
                    0,
                    internalFormat,
                    width,
                    height,
                    depth,
                    0,
                    format,
                    type,
                    null
                );
            } else {
                this.gl.texImage2D(
                    target,
                    0,
                    internalFormat,
                    width,
                    height,
                    0,
                    format,
                    type,
                    null
                );
            }
        }

        // Additional texture settings
        if (wrapS) {
            this.gl.texParameteri(target, this.gl.TEXTURE_WRAP_S, wrapS);
        }
        if (wrapT) {
            this.gl.texParameteri(target, this.gl.TEXTURE_WRAP_T, wrapT);
        }
        if (wrapR) {
            this.gl.texParameteri(target, this.gl.TEXTURE_WRAP_R, wrapR);
        }
        if (min) {
            this.gl.texParameteri(target, this.gl.TEXTURE_MIN_FILTER, min);
        }
        if (mag) {
            this.gl.texParameteri(target, this.gl.TEXTURE_MAG_FILTER, mag);
        }
        if (mip) {
            this.gl.generateMipmap(target);
        }

        return texture;
    }

    /* Create framebuffer using options or default values. */
    public createFramebuffer({ color, depth, stencil }: FramebufferOptions) {
        const framebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

        if (color) {
            for (let i = 0; i < color.length; ++i) {
                this.gl.framebufferTexture2D(
                    this.gl.FRAMEBUFFER,
                    this.gl.COLOR_ATTACHMENT0 + i,
                    this.gl.TEXTURE_2D,
                    color[i],
                    0
                );
            }
        }

        if (depth) {
            this.gl.framebufferRenderbuffer(
                this.gl.FRAMEBUFFER,
                this.gl.DEPTH_ATTACHMENT,
                this.gl.RENDERBUFFER,
                depth
            );
        }

        if (stencil) {
            this.gl.framebufferRenderbuffer(
                this.gl.FRAMEBUFFER,
                this.gl.STENCIL_ATTACHMENT,
                this.gl.RENDERBUFFER,
                stencil
            );
        }

        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("Cannot create framebuffer: " + status);
        }

        return framebuffer;
    }

    /* Create buffer using options or defaults. */
    public createBuffer({ target, hint, buffer, data }: BufferOptions) {
        target = target || this.gl.ARRAY_BUFFER;
        hint = hint || this.gl.STATIC_DRAW;
        buffer = buffer || this.gl.createBuffer();

        this.gl.bindBuffer(target, buffer);
        this.gl.bufferData(target, data, hint);

        return buffer;
    }

    public createUnitQuad(): WebGLBuffer {
        return this.createBuffer({
            data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        });
    }

    public createClipQuad(): WebGLBuffer {
        return this.createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
        });
    }
}

interface TextureOptions {
    target?: number;
    internalFormat?: number;
    format?: number;
    type?: number;
    texture?: WebGLTexture;
    unit?: number;
    image?: ImageData;
    width: number;
    height: number;
    depth?: number;
    wrapS?: number;
    wrapT?: number;
    wrapR?: number;
    min?: number;
    mag?: number;
    mip?: boolean;
}

interface FramebufferOptions {
    color?: WebGLTexture[];
    depth?: WebGLRenderbuffer;
    stencil?: WebGLRenderbuffer;
}

type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array;

interface BufferOptions {
    target?: number;
    hint?: number;
    buffer?: WebGLBuffer;
    data?: ArrayBuffer | SharedArrayBuffer | TypedArray | DataView;
}
