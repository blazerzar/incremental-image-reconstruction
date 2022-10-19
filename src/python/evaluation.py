from os import path
from tabnanny import verbose

import numpy as np
import matplotlib.pyplot as plt
import cv2

from utils import get_random_points, get_center_points, create_initial_image
from solvers import (
    JacobiSolver,
    SuccessiveOverRelaxationSolver,
    ConjugateGradientSolver,
    MultigridSolver,
)


def main():
    np.random.seed(42)

    image_512 = (
        plt.imread(
            path.join(
                path.dirname(__file__), '..', '..', 'public', 'images', 'baboon.jpg'
            )
        )
        / 255.0
    )
    image_2048 = cv2.resize(image_512, (2048, 2048))
    image_1024 = cv2.resize(image_512, (1024, 1024))
    image_256 = cv2.resize(image_512, (256, 256))
    image_128 = cv2.resize(image_512, (128, 128))
    image_64 = cv2.resize(image_512, (64, 64))

    points_random = {}
    for size in (64, 128, 256, 512, 1024, 2048):
        points_random[size] = {}
        for p in (0.01, 0.05, 0.1, 0.2, 0.4, 0.5, 0.8, 0.9):
            points_random[size][p] = get_random_points((size, size), p)

    points_center = {
        2048: get_center_points(image_2048.shape, 2048 // 4),
        1024: get_center_points(image_1024.shape, 1024 // 4),
        512: get_center_points(image_512.shape, 512 // 4),
        256: get_center_points(image_256.shape, 256 // 4),
        128: get_center_points(image_128.shape, 128 // 4),
        64: get_center_points(image_64.shape, 64 // 4),
    }

    # Comparing parameters
    # for w in np.linspace(0, 1, 7)[1:]:
    #     evaluate_solver(
    #         JacobiSolver,
    #         image_256,
    #         points_random[256][0.1],
    #         path.join(
    #             'jacobi',
    #             'parameters',
    #             f'jacobi_256_010_{w:.2f}.csv'.replace('.', '', 1),
    #         ),
    #         weight=w,
    #     )
    # for o in (*np.linspace(0, 1, 7)[1:], *np.linspace(1.1, 1.9, 9)):
    #     evaluate_solver(
    #         SuccessiveOverRelaxationSolver,
    #         image_256,
    #         points_random[256][0.1],
    #         path.join(
    #             'sor',
    #             'parameters',
    #             f'sor_256_010_{o:.2f}.csv'.replace('.', '', 1),
    #         ),
    #         omega=o,
    #     )
    # for n_smooth in np.linspace(10, 50, 5):
    #     evaluate_solver(
    #         MultigridSolver,
    #         image_2048,
    #         points_random[2048][0.1],
    #         path.join(
    #             'multigrid',
    #             'parameters',
    #             f'multigrid_2048_010_{int(n_smooth)}.csv',
    #         ),
    #         n_smooth=n_smooth,
    #     )

    # Comparing boundary conditions


def evaluate_solver(solver_cls, image, points, filename, **kwargs):
    solver = solver_cls(**kwargs)
    x_i = create_initial_image(image, points)
    _, _, stats = solver.solve(x_i, np.zeros_like(x_i), points, verbose=True)

    with open(
        path.join(path.dirname(__file__), '..', '..', 'results', filename),
        'wt',
        encoding='utf-8',
    ) as f:
        f.write('iteration,residual,time\n')
        for i, (residual, time) in enumerate(stats):
            f.write(f'{i},{residual},{time}\n')

    print(f'Saved {filename}')


if __name__ == '__main__':
    main()
