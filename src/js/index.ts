import '/node_modules/katex/dist/katex.min.css';

import { Presenter } from './presenter';
import { SNPSystemModel } from './models/system';
import { SimulatorModel } from './models/simulator';
import { SvgGraphView } from './views/graph-view';
import { UIView } from './views/ui-view';

const presenter = new Presenter(
    new SNPSystemModel(),
    new SimulatorModel(),
    new SvgGraphView(),
    new UIView()
)