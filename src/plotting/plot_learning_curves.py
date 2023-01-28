from os import path

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

from matplotlib.ticker import MultipleLocator, LogLocator

from plot_settings import setup

RESULTS_DIR = path.join(path.dirname(__file__), '..', '..', 'results')


def main():
    setup()

    plot_curve('model')
    plot_curve('model_corrupted')


def plot_curve(filename):
    data = pd.read_csv(path.join(RESULTS_DIR, 'autoencoder', f'{filename}_hist.csv'))

    im_type = 'rekonstruiranimi' if filename == 'model' else 'okvarjenimi'

    # Create figure
    plt.clf()
    plt.title(f'Vrednost funkcije izgube med učenjem\nmodela z {im_type} slikami')
    plt.grid(axis='y', dashes=(10, 10))

    # Plot
    plt.plot(range(1, 101), data['val_loss'], label='valid.', marker='', color='gray', linewidth=1)
    plt.plot(range(1, 101), data['train_loss'], label='učna', marker='', linewidth=1)

    handles, labels = plt.gca().get_legend_handles_labels()
    order = [1, 0]
    plt.legend(
        [handles[i] for i in order],
        [labels[i] for i in order],
        title='Izguba',
        handlelength=3,
    )

    # Y axis
    plt.ylabel('Izguba', labelpad=10)
    plt.gca().minorticks_on()
    plt.gca().yaxis.set_minor_locator(MultipleLocator(0.005))

    # X axis
    plt.xlabel('Epoha')
    plt.gca().xaxis.set_minor_locator(MultipleLocator(10))
    plt.xlim(1, 100)

    plt.savefig(path.join(RESULTS_DIR, 'autoencoder', f'plot_{filename}.pdf'))
    # plt.show()


if __name__ == '__main__':
    main()
