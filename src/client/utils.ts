export async function getSource(url: string): Promise<string> {
    const response = await fetch(url);
    const source = await response.text();
    return source;
}

export async function getImage(url: string): Promise<ImageData> {
    const image = new Image();
    await new Promise((resolve) => {
        image.onload = () => resolve(null);
        image.src = url;
    });

    const imageCanvas = document.createElement("canvas");
    imageCanvas.width = image.width;
    imageCanvas.height = image.height;

    const imageContext = imageCanvas.getContext("2d");
    imageContext.drawImage(image, 0, 0, image.width, image.height);

    return imageContext.getImageData(0, 0, image.width, image.height);
}
