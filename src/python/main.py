from time import time
from os import path

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
        path.join(path.dirname(__file__), '..', '..', 'public', 'images', 'cat.jpg')
    )
    image = cv2.resize(image, dsize=(SIZE, SIZE)) / 255.0

    plt.imshow(image)
    plt.show()

    # Select points for the boundary conditions
    points_factor = 0.01
    points = np.array([[i, j] for i in range(SIZE) for j in range(SIZE)])
    points = points[
        np.random.choice(
            points.shape[0], int(points_factor * SIZE**2), replace=False
        ),
        :,
    ]
    x_i = np.zeros_like(image)
    x_i[points[:, 0], points[:, 1]] = image[points[:, 0], points[:, 1]]

    print('Compiling...')
    # solver = JacobiSolver()
    # solver = SuccessiveOverRelaxationSolver(omega=1.9)
    # solver = ConjugateGradientSolver()
    # solver = MultigridSolver()
    # solver = MultigridSolver(smoother=JacobiSolver(weight=0.67))
    solver = MultigridSolver(smoother=SuccessiveOverRelaxationSolver(omega=1.9))
    # solver = MultigridSolver(
    #     smoother=ConjugateGradientSolver(save_state=False), min_grid_size=SIZE / 8
    # )
    print('Done.')

    start = time()
    result, residual, iterations = solver.solve(
        x_i, np.zeros_like(x_i), points, verbose=True
    )
    print(f'Elapsed time: {time() - start:.2f} s')
    print(f'Iterations: {iterations}')
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
