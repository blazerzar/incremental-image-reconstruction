export async function getSource(url: string): Promise<string> {
    const response = await fetch(url);
    const source = await response.text();
    return source;
}

export async function getImage(url: string, size: number): Promise<ImageData> {
    const image = new Image();
    await new Promise((resolve) => {
        image.onload = () => resolve(null);
        image.src = url;
    });

    const square = Math.min(image.width, image.height);
    let x = 0;
    let y = 0;
    if (image.width < image.height) {
        y = Math.trunc((image.height - square) / 2);
    } else if (image.height < image.width) {
        x = Math.trunc((image.width - square) / 2);
    }

    const imageCanvas = document.createElement("canvas");
    imageCanvas.width = size;
    imageCanvas.height = size;
    const imageContext = imageCanvas.getContext("2d");
    imageContext.drawImage(image, x, y, square, square, 0, 0, size, size);

    return imageContext.getImageData(0, 0, size, size);
}
