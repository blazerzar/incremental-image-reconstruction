from os import path, listdir

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

from matplotlib.ticker import MultipleLocator, LogLocator

from plot_settings import setup


def main():
    RESULTS_DIR = path.join(path.dirname(__file__), '..', '..', 'results')
    setup()

    results = []
    labels = []

    for file in listdir(path.join(RESULTS_DIR, 'sor', 'parameters')):
        omega = int(file.split('_')[-1][:-4])
        if omega not in {120, 130, 140, 150, 170, 180}:
            continue

        data = pd.read_csv(
            path.join(RESULTS_DIR, 'sor', 'parameters', file), index_col='iteration'
        )['residual']

        results.append(data / data[0])
        labels.append(f'{omega / 100:.2f}')

    # Create figure
    plt.title('Konvergenca zaporedne prekomerne sprostitve')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    for r, l in zip(results, labels):
        # Plot every 50th iterations and the last one
        plt.plot(pd.concat((r[::50], r.iloc[-1:])), label=l, markevery=(1, 1))
    plt.legend(title=r'$\omega$', handlelength=3)

    # Y axis
    plt.ylabel('Relativni ostanek')
    plt.yscale('log')
    plt.yticks(np.logspace(-14, 0, 7))
    plt.gca().yaxis.set_major_locator(LogLocator(numticks=9))
    plt.ylim(1e-14, 1)

    # X axis
    plt.xticks(np.arange(0, 450, 50))
    plt.xlabel('Iteracije')
    plt.gca().minorticks_on()
    plt.gca().xaxis.set_minor_locator(MultipleLocator(25))

    plt.savefig(path.join(RESULTS_DIR, 'sor', 'plot_sor_params.pdf'))
    # plt.show()


if __name__ == '__main__':
    main()
