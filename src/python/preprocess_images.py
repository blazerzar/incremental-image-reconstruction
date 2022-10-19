from os import path
from glob import glob

from solvers import MultigridSolver

import numpy as np
import matplotlib.pyplot as plt
from tqdm import tqdm
import cv2


def main():
    """Read images from all subfolders, select points and reconstruct them."""

    SIZE = 256
    points_factor = 0.05
    solver = MultigridSolver(tol=1e-5)

    for i, image in tqdm(
        enumerate(glob(path.join('dataset', 'image', '**', '*.jpg'), recursive=True))
    ):
        if i % 10:
            continue
        im = cv2.cvtColor(cv2.imread(image), cv2.COLOR_BGR2RGB)

        # Get max square image and resize it to 256
        h, w, _ = im.shape
        size = np.minimum(h, w)

        if size == h:
            im = im[:, int((w - size) / 2) : int((w + size) / 2), :]
        else:
            im = im[int((h - size) / 2) : int((h + size) / 2), :, :]
        im = cv2.resize(im, (SIZE, SIZE)) / 255.0

        points = np.array([[i, j] for i in range(SIZE) for j in range(SIZE)])
        points = points[
            np.random.choice(
                points.shape[0], int(points_factor * SIZE**2), replace=False
            ),
            :,
        ]
        x_i = np.zeros_like(im)
        x_i[points[:, 0], points[:, 1]] = im[points[:, 0], points[:, 1]]

        result, _, _ = solver.solve(x_i, np.zeros_like(x_i), points)

        points_image = np.zeros_like(im, dtype=np.uint8)
        points_image[points[:, 0], points[:, 1]] = 255
        im = (im * 255).astype(np.uint8)
        result = (result * 255).astype(np.uint8)

        im_name = f'{i+1}.png'
        plt.imsave(
            path.join('dataset', 'points', im_name), points_image, vmin=0, vmax=255
        )
        plt.imsave(
            path.join('dataset', 'reconstructed', im_name), result, vmin=0, vmax=255
        )
        plt.imsave(path.join('dataset', 'original', im_name), im, vmin=0, vmax=255)


if __name__ == '__main__':
    main()
