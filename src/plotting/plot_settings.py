import matplotlib as mpl
from cycler import cycler


def setup():
    mpl.rcParams['lines.linewidth'] = 1.0
    mpl.rcParams['lines.dashed_pattern'] = [6, 6]
    mpl.rcParams['lines.dashdot_pattern'] = [3, 5, 1, 5]
    mpl.rcParams['lines.dotted_pattern'] = [1, 3]
    mpl.rcParams['lines.markerfacecolor'] = 'white'
    mpl.rcParams['lines.markersize'] = 8.0
    mpl.rcParams['lines.markeredgewidth'] = 1.5

    mpl.rcParams['figure.figsize'] = [8, 5]
    mpl.rcParams['figure.dpi'] = 100
    mpl.rcParams['savefig.dpi'] = 100

    mpl.rcParams['font.size'] = 16
    mpl.rcParams['text.usetex'] = True
    mpl.rcParams['font.family'] = 'CMU Serif'
    mpl.rcParams['legend.fontsize'] = 'small'
    mpl.rcParams['figure.titlesize'] = 'medium'

    mpl.rcParams['axes.autolimit_mode'] = 'round_numbers'
    mpl.rcParams['axes.xmargin'] = 0
    mpl.rcParams['axes.ymargin'] = 0

    mpl.rcParams['xtick.direction'] = 'in'
    mpl.rcParams['ytick.direction'] = 'in'
    mpl.rcParams['xtick.top'] = True
    mpl.rcParams['ytick.right'] = True

    monochrome = (
        cycler('color', ['k'])
        * cycler('linestyle', ['-', '--', '-.', ':'])
        * cycler('marker', ['s', 'D', '^', 'v', 'o'])
    )
    mpl.rcParams['axes.prop_cycle'] = monochrome
