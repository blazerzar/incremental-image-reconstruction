from abc import ABC, abstractmethod

import numpy as np
from numba import njit
import cv2


class Solver(ABC):
    """Abstract class for Poisson's equation (nabla^2 phi = f) solver."""

    def __init__(self, tol=1e-11):
        """Set tolerance which is used for solver termination."""
        self.tol = tol

        self.residual(np.zeros((2, 2, 3)), np.zeros((2, 2, 3)), np.zeros((2, 2)))

    def solve(self, x_i, f, points, verbose=False):
        """Solve Poisson'n equation nabla^2 phi = f using boundary conditions
           in points.

        Parameters:
            x_i: np.ndarray (n, n) ... starting approximation
            f: np.ndarray (n, n)
            points: np.ndarray (m, 2)

        n ... matrix size
        m ... number of boundary conditions
        """
        boundary_m = np.ones(x_i.shape[:2])
        boundary_m[points[:, 0], points[:, 1]] = -1

        residual_norm = self._residual_norm(
            self.residual(x_i, f, boundary_m), x_i.shape[0]
        )
        iterations = 0

        while residual_norm > self.tol:
            iterations += 1
            x_i = self.iteration(x_i, f, boundary_m)

            residual = self.residual(x_i, f, boundary_m)
            residual_norm = self._residual_norm(residual, x_i.shape[0])

            if verbose:
                print(residual_norm)

        return np.clip(x_i, 0, 1), residual, iterations

    def residual(self, x_i, f, boundary_m):
        """Compute Poisson's equation residual. Residual on boundary points
        is set to be 0.

        Residual formula:
        r_ij = f_ij - (
            x_{i-1}j + x_{i+1}j + x_i{j-1} + x_i{j+1} - 4 * x_ij
        ) / h^2
        """
        return _residual(np.pad(x_i, ((1, 1), (1, 1), (0, 0))), f, boundary_m)

    def _residual_norm(self, r, n):
        return np.linalg.norm(r) / n**2

    @abstractmethod
    def iteration(self, x_i, f, boundary_m, iters=1):
        pass


@njit
def _residual(x_i, f, boundary_m):
    h = 1 / (f.shape[0] - 1)
    r = np.zeros_like(f)

    for i in range(f.shape[0]):
        n_vertical = (i > 0) + (i < f.shape[0] - 1)

        for j in range(f.shape[1]):
            if boundary_m[i, j] < 1:
                continue

            n = n_vertical + (j > 0) + (j < f.shape[1] - 1)

            r[i, j] = (
                f[i, j]
                - (
                    x_i[i, j + 1]
                    + x_i[i + 1, j]
                    + x_i[i + 1, j + 2]
                    + x_i[i + 2, j + 1]
                    - n * x_i[i + 1, j + 1]
                )
                / h**2
            )

    return r


class JacobiSolver(Solver):
    """Poisson's equation solver implemented using Jacobi iteration."""

    def __init__(self, tol=1e-11, weight=1):
        """Initialize Jacobi solver parameters. If weight != 1, weighted
        Jacobi iteration is used.

        Parameters:
            weight: float in (0, 1]
        """
        super().__init__(tol)
        self.weight = weight

        self.iteration(np.zeros((2, 2, 3)), np.zeros((2, 2, 3)), np.zeros((2, 2)))

    def iteration(self, x_i, f, boundary_m, iters=1):
        """Implementation of Jacobi iteration.

        Update formula:
        x_ij_{k+1} = w * (
            x_{i-1}j_k + x_{i+1}j_k + x_i{j-1}_k + x_i{j+1}_k - h^2 * f_ij
        ) / 4 + (1 - w) * x_ij_k
        """
        return _jacobi_iteration(
            np.pad(x_i, ((1, 1), (1, 1), (0, 0))),
            f,
            boundary_m,
            self.weight,
            iters,
        )


@njit
def _jacobi_iteration(x_i, f, boundary_m, w, iters):
    h = 1 / (f.shape[0] - 1)

    for _ in range(iters):
        x_i_prime = x_i.copy()

        for i in range(f.shape[0]):
            n_vertical = (i > 0) + (i < f.shape[0] - 1)

            for j in range(f.shape[1]):
                if boundary_m[i, j] < 1:
                    continue

                n = n_vertical + (j > 0) + (j < f.shape[1] - 1)

                x_i_prime[i + 1, j + 1] = (
                    x_i[i, j + 1]
                    + x_i[i + 1, j]
                    + x_i[i + 1, j + 2]
                    + x_i[i + 2, j + 1]
                    - h**2 * f[i, j]
                ) / n * w + (1 - w) * x_i[i + 1, j + 1]

        x_i = x_i_prime

    return x_i_prime[1:-1, 1:-1]


class SuccessiveOverRelaxationSolver(Solver):
    """Poisson's equation solver implemented using Successive Over Relaxation
    iteration."""

    def __init__(self, tol=1e-11, omega=1):
        """Initialize SOR solver parameters. If omega == 1, iteration
        becomes Gauss-Seidel. SOR implementation is using red-black GS.

        Parameters:
            omega: float in (0, 2)
        """
        super().__init__(tol)
        self.omega = omega

        self.iteration(np.zeros((2, 2, 3)), np.zeros((2, 2, 3)), np.zeros((2, 2)))

    def iteration(self, x_i, f, boundary_m, iters=1):
        """Implementation of SOR iteration using red-black Gauss-Seidel.

        Update formula:
        x_ij_{k+1} = omega * (
            x_{i-1}j_{k+1} + x_{i+1}j_{k+1} + x_i{j-1}_{k+1} + x_i{j+1}_{k+1}
            - h^2 * f_ij
        ) / 4 + (1 - omega) * x_ij_k
        """
        return _sor_iteration(
            np.pad(x_i, ((1, 1), (1, 1), (0, 0))),
            f,
            boundary_m,
            self.omega,
            iters,
        )


@njit
def _sor_iteration(x_i, f, boundary_m, omega, iters):
    h = 1 / (f.shape[0] - 1)

    for _ in range(iters):
        x_i_prime = x_i.copy()

        for color in (0, 1):
            for i in range(f.shape[0]):
                n_vertical = (i > 0) + (i < f.shape[0] - 1)

                for j in range((i + color) % 2, f.shape[1], 2):
                    if boundary_m[i, j] < 1:
                        continue

                    n = n_vertical + (j > 0) + (j < f.shape[1] - 1)

                    x_i_prime[i + 1, j + 1] = (
                        x_i_prime[i, j + 1]
                        + x_i_prime[i + 1, j]
                        + x_i_prime[i + 1, j + 2]
                        + x_i_prime[i + 2, j + 1]
                        - h**2 * f[i, j]
                    ) / n * omega + (1 - omega) * x_i[i + 1, j + 1]

        x_i = x_i_prime

    return x_i_prime[1:-1, 1:-1]


class ConjugateGradientSolver(Solver):
    """Poisson's equation solver implemented using conjugate gradient method."""

    def __init__(self, tol=1e-11, save_state=True):
        """Initialize attribute holding conjugate gradient and next residual.

        Parameters:
            save_state: bool ... preserve state after each iteration
        """
        super().__init__(tol)
        self.reset_solver()
        self.save_state = save_state

        _laplacian(np.zeros((4, 4, 3)), np.zeros((2, 2)))
        self.reset_solver()

    def reset_solver(self):
        self.conjugate_gradient = None
        self.next_residual = None

    def iteration(self, x_i, f, boundary_m, iters=1):
        """Implementation of conjugate gradient iteration."""
        if self.conjugate_gradient is None:
            r = self.residual(x_i, f, boundary_m)
            p = r
        else:
            r = self.next_residual
            p = self.conjugate_gradient

        x_i_prime = x_i.copy()

        for _ in range(iters):
            A_p = _laplacian(np.pad(p, ((1, 1), (1, 1), (0, 0))), boundary_m)
            alpha = np.sum(r * r) / np.sum(p * A_p)

            x_i_prime += alpha * p
            r_next = r - alpha * A_p

            beta = np.sum(r_next * r_next) / np.sum(r * r)
            p = r_next + beta * p
            r = r_next

        if self.save_state:
            self.next_residual = r_next
            self.conjugate_gradient = p

        return x_i_prime


@njit
def _laplacian(x_i, boundary_m):
    h = 1 / (boundary_m.shape[0] - 1)
    l = np.zeros((*boundary_m.shape, x_i.shape[2]))

    for i in range(boundary_m.shape[0]):
        n_vertical = (i > 0) + (i < boundary_m.shape[0] - 1)
        for j in range(boundary_m.shape[1]):
            if boundary_m[i, j] < 1:
                continue

            n = n_vertical + (j > 0) + (j < boundary_m.shape[1] - 1)

            l[i, j] = (
                x_i[i, j + 1]
                + x_i[i + 1, j]
                + x_i[i + 1, j + 2]
                + x_i[i + 2, j + 1]
                - n * x_i[i + 1, j + 1]
            ) / h**2

    return l


class MultigridSolver(Solver):
    """Poisson's equation solver implemented using multigrid iteration."""

    def __init__(
        self, tol=1e-11, smoother=None, min_grid_size=2, n_smooth=50, n_solve=10
    ):
        """Initialize multigrid solver parameters. Smoother is the solver
        used in the pre and post smoothing steps. Multigrid is recursively
        called to solve coarser grid problem. Problem on the smallest grid
        is directly solved.

        Parameters:
            smoother: Solver
            min_grid_size: int
            n_smooth: int ... number of smoothing iteration
            n_solve: int ... number of iteration when doing direct solve
        """
        super().__init__(tol)
        if smoother is None:
            smoother = JacobiSolver()

        self.smoother = smoother
        self.min_grid_size = min_grid_size
        self.n_smooth = n_smooth
        self.n_solve = n_solve

        _restriction(np.zeros((2, 2)))

    def iteration(self, x_i, f, boundary_m, iters=1):
        """Implementation of multigrid iteration."""
        return self.v_cycle(x_i, f, boundary_m)

    def v_cycle(self, x_i, f, boundary_m):
        """Implementation of multigrid V-cycle."""
        x_i = self.smoother.iteration(x_i, f, boundary_m, self.n_smooth)

        r = self.residual(x_i, f, boundary_m)
        rhs = _restriction(r)

        eps = np.zeros_like(rhs)
        boundary_restricted = _restriction(boundary_m)
        pixels_to_solve = np.sum(boundary_restricted == 1)

        if pixels_to_solve:
            if eps.shape[0] <= self.min_grid_size:
                eps = self.smoother.iteration(
                    eps, rhs, boundary_restricted, self.n_solve
                )
            else:
                eps = self.v_cycle(eps, rhs, boundary_restricted)

            correction = cv2.resize(eps, (x_i.shape[1], x_i.shape[0]))
            x_i += correction

        x_i = self.smoother.iteration(x_i, f, boundary_m, self.n_smooth)

        return x_i


@njit
def _restriction(r):
    return 0.25 * (r[::2, ::2] + r[::2, 1::2] + r[1::2, ::2] + r[1::2, 1::2])
