import { Presenter } from './presenter'
import { SNPSystemModel } from './models/system'
import { SimulatorModel } from './models/simulator'
import VivaSvgGraphView from './views/graph-view-renderers/viva-svg'
import SigmaGraphView from './views/graph-view-renderers/sigma'
import { UIView } from './views/ui-view'

const presenter = new Presenter(
    new SNPSystemModel(),
    new SimulatorModel(),
    new VivaSvgGraphView(),
    new UIView()
)