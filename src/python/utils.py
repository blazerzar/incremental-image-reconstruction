import numpy as np
from numba import njit


@njit
def get_random_points(image_shape, p):
    """Generate [p] random points from the image."""
    h = image_shape[0]
    w = image_shape[1]

    points = np.array([[i, j] for i in range(h) for j in range(w)])
    points = points[
        np.random.choice(points.shape[0], int(p * h * w), replace=False),
        :,
    ]
    return points


@njit
def get_center_points(image_shape, size):
    """Generate points that represent center square of [size]."""
    h = image_shape[0]
    w = image_shape[1]

    x_0, y_0 = int((w - size) / 2), int((h - size) / 2)
    points = np.array(
        [[i, j] for i in range(y_0, y_0 + size) for j in range(x_0, x_0 + size)]
    )
    return points


def create_initial_image(image, points):
    """Create starting reconstruction image by copying only boundary points."""
    x_i = np.zeros_like(image)
    x_i[points[:, 0], points[:, 1]] = image[points[:, 0], points[:, 1]]
    return x_i
