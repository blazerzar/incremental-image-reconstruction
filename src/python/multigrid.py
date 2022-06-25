import os

import numpy as np
import matplotlib.pyplot as plt
import cv2

CYCLES = 3
H_MAX = 9


def main():

    # Read image as float and transform it to RGB
    image = cv2.imread(os.path.join(
        os.path.dirname(__file__), '..', '..', 'public', 'images', 'cat.jpg'))
    image = image[:, :, ::-1] / 255.0

    # Select points for the boundary conditions
    points_factor = 0.01
    h, w, _ = image.shape
    boundary = np.random.rand(int(points_factor * w * h), 2) * np.array([h, w])
    boundary = boundary.astype(int)
    print(f'Number of initial points: {boundary.shape[0]}')

    reconstructed = np.zeros(image.shape, dtype=float)
    reconstructed[boundary[:, 0], boundary[:, 1], :] = \
        image[boundary[:, 0], boundary[:, 1], :]

    fig, ax = plt.subplots(1, 3)
    ax[0].imshow(image)
    ax[0].set_title('Original')
    ax[0].axis('off')
    ax[1].imshow(reconstructed)
    ax[1].set_title('Sparse')
    ax[1].axis('off')

    iterations = 0

    while True:
        iterations += 1

        reconstructed_prime = v_cycle(reconstructed)

        # Reset boundary conditions
        reconstructed_prime[boundary[:, 0], boundary[:, 1], :] = \
            image[boundary[:, 0], boundary[:, 1], :]

        # Check for convergence
        diff = np.sum((reconstructed_prime - reconstructed) ** 2)
        if diff < 10e-5:
            break

        reconstructed = reconstructed_prime

        cv2.imshow('Multigrid', reconstructed[:, :, ::-1])
        cv2.waitKey(1)

    cv2.destroyAllWindows()
    print(f'Number of iterations: {iterations}')

    ax[2].imshow(reconstructed)
    ax[2].set_title('Reconstructed')
    ax[2].axis('off')

    plt.show()

    r = residual(reconstructed, np.zeros(reconstructed.shape))
    plt.imshow(r)
    plt.show()


def v_cycle(phi, f=None, h=1):
    if f is None:
        f = np.zeros(phi.shape, dtype=float)

    phi = smoothing(phi, f)

    r = residual(phi, f)

    rhs = restriction(r)

    eps = np.zeros(rhs.shape, dtype=float)

    if h == H_MAX:
        eps = smoothing(eps, rhs)
    else:
        eps = v_cycle(eps, rhs, h + 1)

    phi = phi - prolongation(phi, eps, h)

    phi = smoothing(phi, f)

    return phi


def smoothing(phi, f):
    kernel = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]])

    for _ in range(CYCLES):
        # p_{x,y} = (p_{x,y-1} + p_{x-1,y} + p_{x+1,y} + p_{x,y+1} - b_xy) / 4
        phi = (cv2.filter2D(phi, -1, kernel) - f) / 4

    return phi


def residual(phi, f):
    kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]])
    return f - cv2.filter2D(phi, -1, kernel)


def restriction(r):
    # kernel = np.array([[1, 1, 0], [1, 1, 0], [0, 0, 0]]) / 4
    kernel = 2.0 ** np.array([[-4, -3, -4], [-3, -2, -3], [-4, -3, -4]])
    r = cv2.filter2D(r, -1, kernel)
    return r[::2, ::2, :]


def prolongation(phi, eps, h):
    result = cv2.resize(eps, (phi.shape[1], phi.shape[0]))
    return result
    upscaled = np.zeros(phi.shape)
    upscaled[::2, ::2] = eps
    upscaled[::2, -1] = eps[:, -1] / 2
    upscaled[::2, 1:-1:2] = 0.5 * (eps[:, :-1] + eps[:, 1:])
    upscaled[1:-1:2, :] = 0.5 * (upscaled[:-2:2, :] + upscaled[2::2, :])
    upscaled[-1, :] = 0.5 * upscaled[-2, :]

    if h == 1:
        cv2.imshow('Before', eps)
        cv2.waitKey(1)
        cv2.imshow('After', upscaled)
        cv2.waitKey(10000)

    return upscaled


if __name__ == '__main__':
    main()
