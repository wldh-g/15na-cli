/* IRONA Client Program is subject to the terms of the Mozilla Public License 2.0.
 * You can obtain a copy of MPL at LICENSE.md of root directory. */

import React from 'react';
import { hot } from 'react-hot-loader';
import { Pivot, PivotItem } from 'office-ui-fabric-react';

import DebugPanel from './DebugPanel';
import StatusPanel from './StatusPanel';
import RegisterForm from './RegisterForm';

import './style.scss';

const { remote } = window.module.require('electron');

type Area = {
  aid: string
  name: string
}

type DebugConfig = {
  slideInterval: number
  txArray: Array<number>
  rxArray: Array<number>
  labels: Array<string>
  targetLabelIndex: number
  areas: Array<Area>
  amplitude: boolean
  phase: boolean
  pps: number
}

type PrimRegisterInfo = {
  name: string
  areaCount: number
  connected: number
  debugMode: boolean
  debugConfig?: DebugConfig
}

type RegisterInfo = PrimRegisterInfo | null

type States = {
  io: any
  regInfo: RegisterInfo
  host: string
}

class MainPage extends React.Component<{}, States> {
  registerForm: React.RefObject<RegisterForm>

  constructor(props) {
    super(props);
    this.state = { io: null, regInfo: null, host: '' };
    this.registerSocket = this.registerSocket.bind(this);
    this.registerInfo = this.registerInfo.bind(this);
    this.registerHost = this.registerHost.bind(this);
  }

  registerSocket(io) {
    // Save basics
    this.setState({ io });
    io.on('disconnect', () => {
      io.close();
      this.setState({ io: null });
    });
    io.on('alert', (fallInfo) => {
      let alertWindow = new remote.BrowserWindow({
        width: 400,
        height: 440,
        backgroundColor: '#CD5C5C',
        show: true,
        frame: false,
        resizable: false,
        webPreferences: { nodeIntegration: true },
      });

      alertWindow.once('closed', () => {
        alertWindow = null;
      });

      let windowLoadPromise;
      if (window.IRONA.port) {
        windowLoadPromise = alertWindow.loadURL(`http://localhost:${window.IRONA.port}/alert.html`);
      } else {
        windowLoadPromise = alertWindow.loadFile('public/alert.html');
      }

      windowLoadPromise.then(() => {
        alertWindow.webContents.executeJavaScript(`IRONA.setFallInformation('${fallInfo}')`);
      });
    });
  }

  registerHost(url) {
    this.setState({ host: url });
  }

  registerInfo(info, resolve, reject) {
    if (
      typeof info.name === 'string'
      && typeof info.areaCount === 'number'
      && typeof info.connected === 'number'
      && typeof info.debugMode === 'boolean'
    ) {
      this.setState({ regInfo: info });
      resolve();
    } else {
      reject('Register result structure is wrong.');
    }
  }

  render() {
    const { io, regInfo, host } = this.state;
    const statusPanel = <StatusPanel regInfo={regInfo} hostURL={host} io={io} />;

    return io !== null ? (
      <main styleName="inner-app">
        {
          regInfo.debugMode && (
            <Pivot>
              <PivotItem headerText="Connection" itemIcon="PlugConnected">
                {statusPanel}
              </PivotItem>
              <PivotItem headerText="Analysis" itemIcon="StackedLineChart">
                <DebugPanel
                  areas={regInfo.debugConfig.areas}
                  tx={regInfo.debugConfig.txArray}
                  rx={regInfo.debugConfig.rxArray}
                  dataInterval={regInfo.debugConfig.slideInterval}
                  labels={regInfo.debugConfig.labels}
                  targetLabelIndex={regInfo.debugConfig.targetLabelIndex}
                  io={io}
                  procAmp={regInfo.debugConfig.amplitude}
                  procPhase={regInfo.debugConfig.phase}
                />
              </PivotItem>
            </Pivot>
          )
        }
        { !regInfo.debugMode && statusPanel }
      </main>
    ) : (
      <main styleName="inner-app">
        <RegisterForm
          registerInfo={this.registerInfo}
          registerSocket={this.registerSocket}
          registerHost={this.registerHost}
        />
      </main>
    );
  }
}

export default hot(module)(MainPage);
