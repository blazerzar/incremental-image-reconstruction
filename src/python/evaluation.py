from os import path, makedirs

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
    print('Preparing data.')

    image = (
        plt.imread(
            path.join(
                path.dirname(__file__), '..', '..', 'public', 'images', 'baboon.jpg'
            )
        )
        / 255.0
    )

    images = {
        64: cv2.resize(image, (64, 64)),
        128: cv2.resize(image, (128, 128)),
        256: cv2.resize(image, (256, 256)),
        512: image,
        1024: cv2.resize(image, (1024, 1024)),
        2048: cv2.resize(image, (2048, 2048)),
    }

    points_random = {
        size: {
            p: get_random_points((size, size), p)
            for p in (0.01, 0.05, 0.1, 0.2, 0.4, 0.5, 0.8, 0.9)
        }
        for size in (64, 128, 256, 512, 1024, 2048)
    }

    points_center = {
        size: get_center_points(image.shape, size // 4)
        for size, image in images.items()
    }

    print('Evaluation started.')

    eval_jacobi = True
    eval_sor = True
    eval_conjugate_gradient = True
    eval_multigrid = True

    if eval_jacobi:
        evaluate_jacobi(images, points_random, points_center)
    if eval_sor:
        evaluate_sor(images, points_random, points_center)
    if eval_conjugate_gradient:
        evaluate_conjugate_gradient(images, points_random, points_center)
    if eval_multigrid:
        evaluate_multigrid(images, points_random, points_center)


def evaluate_jacobi(images, points_random, points_center):
    eval_params, eval_boundary, eval_size = False, False, False

    # Comparing parameters
    for w in np.linspace(0, 1, 7)[1:]:
        if not eval_params:
            break

        evaluate_solver(
            JacobiSolver,
            images[256],
            points_random[256][0.1],
            path.join(
                'jacobi',
                'parameters',
                f'jacobi_256_010_{w:.2f}.csv'.replace('.', '', 1),
            ),
            weight=w,
        )

    # Comparing boundary conditions
    for p, b in points_random[256].items():
        if not eval_boundary:
            break

        evaluate_solver(
            JacobiSolver,
            images[256],
            b,
            path.join(
                'jacobi',
                'boundary',
                f'jacobi_256_{p:.2f}.csv'.replace('.', '', 1),
            ),
        )
    else:
        evaluate_solver(
            JacobiSolver,
            images[256],
            points_center[256],
            path.join('jacobi', 'boundary', f'jacobi_256_center.csv'),
            tol=3e-2,
        )

    # Comparing image sizes
    for size, image in images.items():
        if not eval_size:
            break

        if size in {1024, 2048}:
            continue

        points_r = points_random[size][0.1]
        points_c = points_center[size]
        for name, points in [('010', points_r), ('center', points_c)]:
            evaluate_solver(
                JacobiSolver,
                image,
                points,
                path.join('jacobi', f'size_{name}', f'jacobi_{size}_{name}.csv'),
                **({} if name == '010' else {'tol': 1e-1}),
            )


def evaluate_sor(images, points_random, points_center):
    eval_params, eval_boundary, eval_size = False, False, False

    # Comparing parameters
    for o in (*np.linspace(0, 1, 7)[1:], *np.linspace(1.1, 1.9, 9)):
        if not eval_params:
            break

        evaluate_solver(
            SuccessiveOverRelaxationSolver,
            images[256],
            points_random[256][0.1],
            path.join(
                'sor',
                'parameters',
                f'sor_256_010_{o:.2f}.csv'.replace('.', '', 1),
            ),
            omega=o,
        )

    # Comparing boundary conditions
    for p, b in points_random[256].items():
        if not eval_boundary:
            break

        evaluate_solver(
            SuccessiveOverRelaxationSolver,
            images[256],
            b,
            path.join(
                'sor',
                'boundary',
                f'sor_256_{p:.2f}.csv'.replace('.', '', 1),
            ),
            omega=1.7,
        )
    else:
        evaluate_solver(
            SuccessiveOverRelaxationSolver,
            images[256],
            points_center[256],
            path.join('sor', 'boundary', f'sor_256_center.csv'),
            omega=1.7,
            tol=3e-2,
        )

    # Comparing image sizes
    for size, image in images.items():
        if not eval_size:
            break

        if size in {1024, 2048}:
            continue

        points_r = points_random[size][0.1]
        points_c = points_center[size]
        for name, points in [('010', points_r), ('center', points_c)]:
            evaluate_solver(
                SuccessiveOverRelaxationSolver,
                image,
                points,
                path.join('sor', f'size_{name}', f'sor_{size}_{name}.csv'),
                **({} if name == '010' else {'tol': 1e-1}),
                omega=1.7,
            )


def evaluate_conjugate_gradient(images, points_random, points_center):
    eval_boundary, eval_size = False, False

    # Comparing boundary conditions
    for p, b in points_random[256].items():
        if not eval_boundary:
            break

        evaluate_solver(
            ConjugateGradientSolver,
            images[256],
            b,
            path.join(
                'conjugate_gradient',
                'boundary',
                f'conjugate_gradient_256_{p:.2f}.csv'.replace('.', '', 1),
            ),
        )
    else:
        evaluate_solver(
            ConjugateGradientSolver,
            images[256],
            points_center[256],
            path.join(
                'conjugate_gradient', 'boundary', f'conjugate_gradient_256_center.csv'
            ),
        )

    # Comparing image sizes
    for size, image in images.items():
        if not eval_size:
            break

        if size in {1024, 2048}:
            continue

        points_r = points_random[size][0.1]
        points_c = points_center[size]
        for name, points in [('010', points_r), ('center', points_c)]:
            evaluate_solver(
                ConjugateGradientSolver,
                image,
                points,
                path.join(
                    'conjugate_gradient',
                    f'size_{name}',
                    f'conjugate_gradient_{size}_{name}.csv',
                ),
            )


def evaluate_multigrid(images, points_random, points_center):
    eval_params, eval_boundary, eval_size = False, False, False

    # Comparing parameters
    for n_smooth in np.linspace(10, 50, 5):
        if not eval_params:
            break

        evaluate_solver(
            MultigridSolver,
            images[256],
            points_random[256][0.1],
            path.join(
                'multigrid',
                'parameters',
                f'multigrid_256_010_{int(n_smooth)}.csv',
            ),
            n_smooth=n_smooth,
            eval=True,
        )

    # Comparing boundary conditions
    for p, b in points_random[256].items():
        if not eval_boundary:
            break

        evaluate_solver(
            MultigridSolver,
            images[256],
            b,
            path.join(
                'multigrid',
                'boundary',
                f'multigrid_256_{p:.2f}.csv'.replace('.', '', 1),
            ),
            eval=True,
        )
    else:
        evaluate_solver(
            MultigridSolver,
            images[256],
            points_center[256],
            path.join('multigrid', 'boundary', f'multigrid_256_center.csv'),
            eval=True,
        )

    # Comparing image sizes
    for size, image in images.items():
        if not eval_size:
            break

        if size in {1024, 2048}:
            continue

        points_r = points_random[size][0.1]
        points_c = points_center[size]
        for name, points in [('010', points_r), ('center', points_c)]:
            evaluate_solver(
                MultigridSolver,
                image,
                points,
                path.join('multigrid', f'size_{name}', f'multigrid_{size}_{name}.csv'),
            )


def evaluate_solver(solver_cls, image, points, filename, **kwargs):
    solver = solver_cls(**kwargs)
    x_i = create_initial_image(image, points)
    _, _, stats = solver.solve(x_i, np.zeros_like(x_i), points, verbose=True)

    file_path = path.join(path.dirname(__file__), '..', '..', 'results', filename)
    makedirs(path.dirname(file_path), exist_ok=True)
    with open(file_path, 'wt', encoding='utf-8') as f:
        f.write('iteration,residual,time\n')
        for i, (residual, time) in enumerate(stats):
            f.write(f'{i},{residual},{time}\n')

    print(f'Saved {filename}')


if __name__ == '__main__':
    main()
