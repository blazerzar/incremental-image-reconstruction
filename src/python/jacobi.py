import os

import numpy as np
import matplotlib.pyplot as plt
import cv2

from multigrid import residual


def main():
    image = cv2.imread(os.path.join(
        os.path.dirname(__file__), '..', '..', 'public', 'images', 'cat.jpg'))

    # Select initial points
    points_factor = 0.01
    h, w, _ = image.shape
    points = np.random.rand(int(points_factor * w * h), 2) * np.array([h, w])
    points = points.astype(int)
    print(f'Number of initial points: {points.shape[0]}')

    reconstructed = np.zeros(image.shape, dtype=float)
    reconstructed[points[:, 0], points[:, 1], :] = \
        image[points[:, 0], points[:, 1], :] / 255.0

    fig, ax = plt.subplots(1, 3)
    ax[0].imshow(image[:, :, ::-1])
    ax[0].set_title('Original')
    ax[0].axis('off')
    ax[1].imshow(reconstructed[:, :, ::-1])
    ax[1].set_title('Sparse')
    ax[1].axis('off')

    kernel = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]]) / 4
    iterations = 0
    while True:
        iterations += 1
        # Filter image
        filtered = cv2.filter2D(reconstructed, -1, kernel)
        filtered[points[:, 0], points[:, 1], :] = \
            image[points[:, 0], points[:, 1], :] / 255.0

        # Check for convergence
        diff = np.sum((filtered - reconstructed) ** 2)
        if diff < 10e-5:
            break

        reconstructed = filtered
        cv2.imshow('Jacobi', reconstructed)
        cv2.waitKey(1)

    cv2.destroyAllWindows()
    print(f'Number of iterations: {iterations}')

    ax[2].imshow(reconstructed[:, :, ::-1])
    ax[2].set_title('Reconstructed')
    ax[2].axis('off')

    plt.show()

    r = residual(reconstructed, np.zeros(reconstructed.shape))
    plt.imshow(r)
    plt.show()


if __name__ == '__main__':
    main()
