from os import path, listdir

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

from matplotlib.ticker import MultipleLocator, LogLocator

from plot_settings import setup

RESULTS_DIR = path.join(path.dirname(__file__), '..', '..', 'results')


def main():
    setup()

    plot_params()
    plot_boundary()
    plot_size()


def plot_params():
    results = []
    labels = []

    for file in listdir(path.join(RESULTS_DIR, 'jacobi', 'parameters')):
        w = int(file.split('_')[-1][:-4])

        data = pd.read_csv(
            path.join(RESULTS_DIR, 'jacobi', 'parameters', file), index_col='iteration'
        )['residual']

        results.append(data / data[0])
        labels.append(f'{w / 100:.2f}')

    order = [i for (i, _) in sorted(enumerate(labels), key=lambda x: float(x[1]))]

    # Create figure
    plt.clf()
    plt.title('Konvergenca Jacobijeve metode\npri različnih vrednostih $w$')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in zip(results, labels):
        # Plot every 1000th iterations and the last one
        plt.plot(pd.concat((r[::1000], r.iloc[-1:])), label=l, markevery=(1, 1))

    handles, labels = plt.gca().get_legend_handles_labels()
    plt.legend(
        [handles[i] for i in order],
        [labels[i] for i in order],
        title=r'$w$',
        handlelength=3,
    )

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-14, 0, 7))
    plt.gca().yaxis.set_major_locator(LogLocator(numticks=9))
    plt.ylim(1e-14, 1)

    # X axis
    plt.xticks(np.arange(0, 9000, 2000))
    plt.xlabel('Iteracija')
    plt.gca().minorticks_on()
    plt.gca().xaxis.set_minor_locator(MultipleLocator(1000))

    plt.savefig(path.join(RESULTS_DIR, 'jacobi', 'plot_jacobi_params.pdf'))
    # plt.show()


def plot_boundary():
    results = []
    labels = []

    for file in listdir(path.join(RESULTS_DIR, 'jacobi', 'boundary')):
        p = file.split('_')[-1][:-4]
        try:
            p = f'{int(p) / 100:.2f}'
        except ValueError:
            pass

        if p in {'0.40', '0.90'}:
            continue

        data = pd.read_csv(
            path.join(RESULTS_DIR, 'jacobi', 'boundary', file), index_col='iteration'
        )['residual']

        results.append(data / data[0])
        labels.append(p)

    order = [i for (i, _) in sorted(enumerate(labels), key=lambda x: x[1])]
    labels = [f'{100 * float(p):.0f} \\%' if p[0] == '0' else 'središ.' for p in labels]

    # Create figure
    plt.clf()
    plt.title('Konvergenca Jacobijeve metode\npri različnih robnih pogojih')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in zip(results, labels):
        # Plot every 250th iterations and the last one
        plt.plot(pd.concat((r[::250], r.iloc[-1:])), label=l, markevery=(1, 1))

    handles, labels = plt.gca().get_legend_handles_labels()
    plt.legend(
        [handles[i] for i in order],
        [labels[i] for i in order],
        title='Robni pogoji',
        handlelength=3,
        loc='upper right',
    )

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-14, 0, 7))
    plt.gca().yaxis.set_major_locator(LogLocator(numticks=9))
    plt.ylim(1e-14, 1)

    # X axis
    plt.xlabel('Iteracija')
    plt.gca().minorticks_on()
    plt.gca().xaxis.set_minor_locator(MultipleLocator(250))
    plt.xlim(0, 2500)

    plt.savefig(path.join(RESULTS_DIR, 'jacobi', 'plot_jacobi_boundary.pdf'))
    # plt.show()


def plot_size():
    plot_size_time()
    plot_size_iters()


def plot_size_time():
    results = []
    labels = []

    for file in listdir(path.join(RESULTS_DIR, 'jacobi', 'size_010')):
        size = int(file.split('_')[1])
        data = pd.read_csv(
            path.join(RESULTS_DIR, 'jacobi', 'size_010', file), index_col='iteration'
        )
        data['residual'] /= data['residual'][0]

        results.append(data)
        labels.append(size)

    # Create figure
    plt.clf()
    plt.title('Čas izvajanja Jacobijeve metode\npri različnih velikostih')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in sorted(zip(results, labels), key=lambda x: x[1]):
        plt.plot(
            'time',
            'residual',
            data=pd.concat([r.iloc[::200, :], r.iloc[-1:]]),
            label=l,
            markevery=(1, 1),
        )
    plt.legend(title='Velikost', handlelength=3, loc='upper right')

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-14, 0, 7))
    plt.gca().yaxis.set_major_locator(LogLocator(numticks=9))
    plt.ylim(1e-14, 1)

    # X axis
    plt.xlabel(r'Čas [$s$]')
    plt.gca().minorticks_on()
    plt.gca().xaxis.set_minor_locator(MultipleLocator(10))

    plt.savefig(path.join(RESULTS_DIR, 'jacobi', 'plot_jacobi_size_time.pdf'))
    # plt.show()


def plot_size_iters():
    results = []
    labels = []

    for file in listdir(path.join(RESULTS_DIR, 'jacobi', 'size_center')):
        size = int(file.split('_')[1])
        data = pd.read_csv(
            path.join(RESULTS_DIR, 'jacobi', 'size_center', file), index_col='iteration'
        )['residual']

        results.append(data)
        labels.append(size)

    # Create figure
    plt.clf()
    plt.title('Konvergenca Jacobijeve metode\npri različnih velikostih')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in sorted(zip(results, labels), key=lambda x: x[1]):
        plt.plot(pd.concat((r[::200], r.iloc[-1:])), label=l, markevery=(1, 1))
    plt.legend(title='Velikost', handlelength=3, loc='upper right')

    # Y axis
    plt.ylabel('Ostanek')
    plt.yscale('log')

    # X axis
    plt.xticks(np.arange(0, 1650, 200))
    plt.xlabel('Iteracija')
    plt.gca().minorticks_off()

    plt.savefig(path.join(RESULTS_DIR, 'jacobi', 'plot_jacobi_size_iters.pdf'))
    # plt.show()


if __name__ == '__main__':
    main()
