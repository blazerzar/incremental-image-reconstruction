from time import time
from os import path

from utils import get_random_points, create_initial_image
from solvers import (
    JacobiSolver,
    SuccessiveOverRelaxationSolver,
    ConjugateGradientSolver,
    MultigridSolver,
)

import numpy as np
import matplotlib.pyplot as plt
import cv2

from numba.core.errors import NumbaDeprecationWarning, NumbaPendingDeprecationWarning
import warnings

warnings.simplefilter('ignore', category=NumbaDeprecationWarning)
warnings.simplefilter('ignore', category=NumbaPendingDeprecationWarning)


def main():
    SIZE = 512

    image = plt.imread(
        path.join(
            path.dirname(__file__), '..', '..', 'public', 'images', 'butterfly.jpg'
        )
    )
    image = cv2.resize(image, dsize=(SIZE, SIZE)) / 255.0

    plt.imshow(image)
    plt.show()

    # Select points for the boundary conditions
    points_factor = 0.10
    points = get_random_points(image.shape, points_factor)
    x_i = create_initial_image(image, points)

    print('Compiling...')
    # solver = JacobiSolver()
    # solver = SuccessiveOverRelaxationSolver(omega=1.7)
    # solver = ConjugateGradientSolver()
    solver = MultigridSolver()
    # solver = MultigridSolver(smoother=JacobiSolver(weight=0.67))
    # solver = MultigridSolver(
    #     smoother=ConjugateGradientSolver(save_state=False), min_grid_size=SIZE / 8
    # )
    print('Done.')

    start = time()
    result, residual, stats = solver.solve(
        x_i, np.zeros_like(x_i), points, verbose=True
    )
    print(f'Elapsed time: {time() - start:.2f} s')
    print(f'Iterations: {len(stats) - 1}')
    fig, ax = plt.subplots(1, 3)
    ax[0].set_title('original')
    ax[1].set_title('reconstructed')
    ax[2].set_title('residual')

    ax[0].imshow(image)
    ax[1].imshow(result)
    ax[2].imshow(np.abs(residual))
    plt.show()


if __name__ == '__main__':
    main()
