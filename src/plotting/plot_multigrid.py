from os import path, listdir

import numpy as np
import matplotlib.pyplot as plt
import matplotlib as mpl
import pandas as pd

from plot_settings import setup

RESULTS_DIR = path.join(path.dirname(__file__), '..', '..', 'results')


def main():
    setup()

    results = []
    labels = []

    for file in listdir(path.join(RESULTS_DIR, 'multigrid', 'parameters')):
        n_smooth = int(file.split('_')[-1][:-4])

        data = pd.read_csv(
            path.join(RESULTS_DIR, 'multigrid', 'parameters', file),
            index_col='iteration',
        )
        data['residual'] /= data['residual'][0]

        results.append(data)
        labels.append(n_smooth)

    plot_params_iters(results, labels)
    plot_params_time(results, labels)


def plot_params_iters(results, labels):
    # Create figure
    plt.title('Konvergenca večmrežne metode')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in zip(results, labels):
        plt.plot(
            'iteration',
            'residual',
            data=r.reset_index(level=0),
            label=l,
            markevery=(1, 1),
        )
    plt.legend(title=r'$N_{smooth}$', handlelength=3)

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-16, 0, 9))
    plt.ylim(1e-16, 1)

    # X axis
    plt.xlabel('Iteracije')

    plt.savefig(path.join(RESULTS_DIR, 'multigrid', 'plot_multigrid_params_iters.pdf'))
    # plt.show()


def plot_params_time(results, labels):
    # Create figure
    plt.clf()
    plt.title('Čas izvajanja večmrežne metode')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in zip(results, labels):
        plt.plot('time', 'residual', data=r, label=l, markevery=(1, 1))
    plt.legend(title=r'$N_{smooth}$', handlelength=3)

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-16, 0, 9))
    plt.ylim(1e-16, 1)

    # X axis
    plt.xlabel(r'Čas [$s$]')

    plt.savefig(path.join(RESULTS_DIR, 'multigrid', 'plot_multigrid_params_time.pdf'))
    # plt.show()


if __name__ == '__main__':
    main()
