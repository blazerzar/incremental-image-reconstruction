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
    plt.clf()
    plt.title('Konvergenca večmrežne metode\npri različnih vrednostih $N_g$')
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

    order = [i for (i, _) in sorted(enumerate(labels), key=lambda x: float(x[1]))]
    handles, labels = plt.gca().get_legend_handles_labels()
    plt.legend(
        [handles[i] for i in order],
        [labels[i] for i in order],
        title=r'$N_g$',
        handlelength=3,
    )

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
    plt.title('Čas izvajanja večmrežne metode\npri različnih vrednostih $N_g$')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in zip(results, labels):
        plt.plot('time', 'residual', data=r, label=l, markevery=(1, 1))

    order = [i for (i, _) in sorted(enumerate(labels), key=lambda x: float(x[1]))]
    handles, labels = plt.gca().get_legend_handles_labels()
    plt.legend(
        [handles[i] for i in order],
        [labels[i] for i in order],
        title=r'$N_g$',
        handlelength=3,
    )

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-16, 0, 9))
    plt.ylim(1e-16, 1)

    # X axis
    plt.xlabel(r'Čas [$s$]')

    plt.savefig(path.join(RESULTS_DIR, 'multigrid', 'plot_multigrid_params_time.pdf'))
    # plt.show()


def plot_boundary():
    results = []
    labels = []

    for file in listdir(path.join(RESULTS_DIR, 'multigrid', 'boundary')):
        p = file.split('_')[-1][:-4]
        try:
            p = f'{int(p) / 100:.2f}'
        except ValueError:
            pass

        if p not in {'0.01', '0.05', '0.10', 'center'}:
            continue

        data = pd.read_csv(
            path.join(RESULTS_DIR, 'multigrid', 'boundary', file),
            index_col='iteration',
        )['residual']

        results.append(data / data[0])
        labels.append(p)

    order = [i for (i, _) in sorted(enumerate(labels), key=lambda x: x[1])]
    labels = [f'{100 * float(p):.0f} \\%' if p[0] == '0' else 'središ.' for p in labels]

    # Create figure
    plt.clf()
    plt.title('Konvergenca večmrežne metode\npri različnih robnih pogojih')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in zip(results, labels):
        plt.plot(r, label=l, markevery=(1, 1))

    handles, labels = plt.gca().get_legend_handles_labels()
    plt.legend(
        [handles[i] for i in order],
        [labels[i] for i in order],
        title='robni pogoji',
        handlelength=3,
        loc='upper right',
    )

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.gca().yaxis.set_major_locator(LogLocator(numticks=9))
    plt.ylim(1e-16, 1)

    # X axis
    plt.xlabel('Iteracije')
    plt.xticks(np.arange(0, 21, 2))
    plt.gca().minorticks_on()
    plt.gca().xaxis.set_minor_locator(MultipleLocator(1))

    plt.savefig(path.join(RESULTS_DIR, 'multigrid', 'plot_multigrid_boundary.pdf'))
    # plt.show()


def plot_size():
    plot_size_time()
    plot_size_iters()


def plot_size_time():
    results = []
    labels = []

    for file in listdir(path.join(RESULTS_DIR, 'multigrid', 'size_010')):
        size = int(file.split('_')[1])
        data = pd.read_csv(
            path.join(RESULTS_DIR, 'multigrid', 'size_010', file),
            index_col='iteration',
        )
        data['residual'] /= data['residual'][0]

        results.append(data)
        labels.append(size)

    # Create figure
    plt.clf()
    plt.title('Čas izvajanja večmrežne metode\npri različnih velikostih')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in sorted(zip(results, labels), key=lambda x: x[1]):
        plt.plot(
            'time',
            'residual',
            data=r,
            label=l,
            markevery=(1, 1),
        )
    plt.legend(title='velikost', handlelength=3, loc='upper right')

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-16, 0, 9))
    plt.gca().yaxis.set_major_locator(LogLocator(numticks=9))

    # X axis
    plt.xticks(np.arange(0, 9, 1))
    plt.xlabel(r'Čas [$s$]')

    plt.savefig(path.join(RESULTS_DIR, 'multigrid', 'plot_multigrid_size_time.pdf'))
    # plt.show()


def plot_size_iters():
    results = []
    labels = []

    for file in listdir(path.join(RESULTS_DIR, 'multigrid', 'size_center')):
        size = int(file.split('_')[1])
        data = pd.read_csv(
            path.join(RESULTS_DIR, 'multigrid', 'size_center', file),
            index_col='iteration',
        )['residual']

        results.append(data / data[0])
        labels.append(size)

    # Create figure
    plt.clf()
    plt.title('Konvergenca večmrežne metode\npri različnih velikostih')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in sorted(zip(results, labels), key=lambda x: x[1]):
        plt.plot(r, label=l, markevery=(1, 1))
    plt.legend(title='velikost', handlelength=3, loc='upper right')

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-14, 0, 7))
    plt.gca().yaxis.set_major_locator(LogLocator(numticks=9))

    # X axis
    plt.xticks(np.arange(0, 22, 2))
    plt.xlabel('Iteracije')
    plt.gca().minorticks_off()
    plt.gca().minorticks_on()
    plt.gca().xaxis.set_minor_locator(MultipleLocator(250))

    plt.savefig(path.join(RESULTS_DIR, 'multigrid', 'plot_multigrid_size_iters.pdf'))
    # plt.show()


if __name__ == '__main__':
    main()
