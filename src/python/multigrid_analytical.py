import numpy as np
import matplotlib.pyplot as plt
import cv2

CYCLES = 3
H_MAX = 6
SIZE = 64


def main():
    x, y = np.meshgrid(np.linspace(0, 1, SIZE), np.linspace(0, 1, SIZE))
    u = (x**2 - x**4) * (y**4 - y**2)
    f = -2 * (
        (1 - 6 * x**2) * (1 - y**2) * y**2
        + (1 - 6 * y**2) * (1 - x**2) * x**2
    )

    plt.imshow(u, origin='lower', cmap='jet')
    plt.show()

    reconstructed = np.zeros(u.shape, dtype=float)
    kernel = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]])
    points = np.array(
        [
            [x, y]
            for x, y in np.array(
                np.meshgrid(np.arange(0, SIZE), np.arange(0, SIZE))
            ).T.reshape(-1, 2)
            if x in (0, SIZE - 1) or y in (0, SIZE - 1)
        ]
    )

    while True:
        # Filter image
        # filtered = (cv2.filter2D(reconstructed, -1, kernel) - f) / 4

        reconstructed_prime = v_cycle(reconstructed, f)
        reconstructed_prime[points[:, 0], points[:, 1]] = 0

        # Check for convergence
        diff = np.sum((reconstructed_prime - reconstructed) ** 2)
        print(diff)
        if diff < 10e-5:
            break

        reconstructed = reconstructed_prime

        plt.clf()
        plt.imshow(reconstructed, origin='lower', cmap='jet')
        plt.pause(10e-15)


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

    phi = phi - prolongation(phi, eps)

    phi = smoothing(phi, f)

    return phi


def smoothing(phi, f):
    kernel = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]])

    for _ in range(CYCLES):
        phi = (cv2.filter2D(phi, -1, kernel) - f) / 4

    return phi


def residual(phi, f):
    kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]])
    return f - cv2.filter2D(phi, -1, kernel)


def restriction(r):
    kernel = np.array([[1, 1, 0], [1, 1, 0], [0, 0, 0]]) / 4
    # kernel = 2.0 ** np.array([[-4, -3, -4], [-3, -2, -3], [-4, -3, -4]])
    r = cv2.filter2D(r, -1, kernel)
    return r[::2, ::2]


def prolongation(phi, eps):
    result = cv2.resize(eps, (phi.shape[1], phi.shape[0]))
    return result


if __name__ == '__main__':
    main()
