from os import path

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

from matplotlib.ticker import MultipleLocator, LogLocator

from plot_settings import setup

RESULTS_DIR = path.join(path.dirname(__file__), '..', '..', 'results')


def main():
    setup()

    plot_512_010()
    plot_512_center()


def plot_512_010():
    results = []
    labels = ['Jacobi', 'SOR', 'CG', 'MG']

    for method in ('jacobi', 'sor', 'conjugate_gradient', 'multigrid'):
        filename = f'{method}_512_010.csv'
        data = pd.read_csv(
            path.join(RESULTS_DIR, method, 'size_010', filename),
            index_col='iteration',
        )
        data['residual'] /= data['residual'][0]

        results.append(data)

    plot_512_010_iters(results, labels)
    plot_512_010_time(results, labels)


def plot_512_010_iters(results, labels):
    # Create figure
    plt.clf()
    plt.title('Konvergenca s sliko velikosti 512 in $10\, \%$ naključnih točk')
    plt.grid(axis='y', dashes=(10, 10))

    steps = {
        'Jacobi': 200,
        'SOR': 50,
        'CG': 50,
        'MG': 1,
    }

    # Plot
    for r, l in zip(results, labels):
        plt.plot(
            'iteration',
            'residual',
            data=pd.concat([r[:: steps[l]], r.iloc[-1:, :]]).reset_index(level=0),
            label=l,
            markevery=(1, 1),
        )
    plt.legend(title='robni pogoji', handlelength=3, loc='upper right')

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-16, 0, 9))
    plt.ylim(1e-16, 1)

    # X axis
    plt.xlabel('Iteracije')
    plt.gca().minorticks_on()
    plt.gca().xaxis.set_minor_locator(MultipleLocator(100))

    plt.savefig(path.join(RESULTS_DIR, 'methods', 'plot_methods_512_010_iters.pdf'))
    # plt.show()


def plot_512_010_time(results, labels):
    # Create figure
    plt.clf()
    plt.title('Čas izvajanja s sliko velikosti 512 in $10\, \%$ naključnih točk')
    plt.grid(axis='y', dashes=(10, 10))

    steps = {
        'Jacobi': 200,
        'SOR': 50,
        'CG': 50,
        'MG': 1,
    }

    # Plot
    for r, l in zip(results, labels):
        plt.plot(
            'time',
            'residual',
            data=pd.concat([r[:: steps[l]], r.iloc[-1:, :]]),
            label=l,
            markevery=(1, 1),
        )
    plt.legend(title='robni pogoji', handlelength=3, loc='upper right')

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-16, 0, 9))
    plt.ylim(1e-16, 1)

    # X axis
    plt.xlabel(r'Čas [$s$]')
    plt.gca().minorticks_on()
    plt.gca().xaxis.set_minor_locator(MultipleLocator(10))

    plt.savefig(path.join(RESULTS_DIR, 'methods', 'plot_methods_512_010_time.pdf'))
    # plt.show()


def plot_512_center():
    results = []
    labels = ['Jacobi', 'SOR', 'CG', 'MG']

    for method in ('jacobi', 'sor', 'conjugate_gradient', 'multigrid'):
        filename = f'{method}_512_center.csv'
        data = pd.read_csv(
            path.join(RESULTS_DIR, method, 'size_center', filename),
            index_col='iteration',
        )
        data['residual'] /= data['residual'][0]

        results.append(data)

    plot_512_center_iters(results, labels)
    plot_512_center_time(results, labels)


def plot_512_center_iters(results, labels):
    # Create figure
    plt.clf()
    plt.title('Konvergenca s sliko velikosti 512 in sredinskimi točkami')
    plt.grid(axis='y', dashes=(10, 10))

    steps = {
        'Jacobi': 500,
        'SOR': 200,
        'CG': 200,
        'MG': 5,
    }

    # Plot
    for r, l in zip(results, labels):
        plt.plot(
            'iteration',
            'residual',
            data=pd.concat([r[:: steps[l]], r.iloc[-1:, :]]).reset_index(level=0),
            label=l,
            markevery=(1, 1),
        )
    plt.legend(title='robni pogoji', handlelength=3, loc='upper right')

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-14, 0, 7))
    plt.gca().yaxis.set_major_locator(LogLocator(numticks=9))
    plt.ylim(1e-14, 1)

    # X axis
    plt.xlabel('Iteracije')
    plt.gca().minorticks_on()
    plt.gca().xaxis.set_minor_locator(MultipleLocator(250))

    plt.savefig(path.join(RESULTS_DIR, 'methods', 'plot_methods_512_center_iters.pdf'))
    # plt.show()


def plot_512_center_time(results, labels):
    # Create figure
    plt.clf()
    plt.title('Čas izvajanja s sliko velikosti 512 in sredinskimi točkami')
    plt.grid(axis='y', dashes=(10, 10))

    steps = {
        'Jacobi': 500,
        'SOR': 200,
        'CG': 200,
        'MG': 5,
    }

    # Plot
    for r, l in zip(results, labels):
        plt.plot(
            'time',
            'residual',
            data=pd.concat([r[:: steps[l]], r.iloc[-1:, :]]),
            label=l,
            markevery=(1, 1),
        )
    plt.legend(title='robni pogoji', handlelength=3, loc='upper right')

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-14, 0, 7))
    plt.gca().yaxis.set_major_locator(LogLocator(numticks=9))
    plt.ylim(1e-14, 1)

    # X axis
    plt.xlabel(r'Čas [$s$]')
    plt.gca().minorticks_on()
    plt.gca().xaxis.set_minor_locator(MultipleLocator(25))

    plt.savefig(path.join(RESULTS_DIR, 'methods', 'plot_methods_512_center_time.pdf'))
    # plt.show()


if __name__ == '__main__':
    main()
