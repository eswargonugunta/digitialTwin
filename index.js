import React from "react";
import ReactDOM from "react-dom";

import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import "./styles.css";
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Heatmap from 'heatmap.js';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing.unit * 2,
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
});

class App extends React.Component {
  videoRef = React.createRef();
  canvasRef = React.createRef();


  componentDidMount() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const webCamPromise = navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            facingMode: "user"
          }
        })
        .then(stream => {
          window.stream = stream;
          this.videoRef.current.srcObject = stream;
          return new Promise((resolve, reject) => {
            this.videoRef.current.onloadedmetadata = () => {
              resolve();
            };
          });
        });
      const modelPromise = cocoSsd.load();
      Promise.all([modelPromise, webCamPromise])
        .then(values => {
          this.detectFrame(this.videoRef.current, values[0]);
        })
        .catch(error => {
          console.error(error);
        });
    }
    this.heatmap = Heatmap.create({
      container: ReactDOM.findDOMNode(this.refs.heatContainer)
    });
    //this.setData(5, [{ x: 10, y: 15, value: 5}]);
  }

  detectFrame = (video, model) => {
    model.detect(video).then(predictions => {
      this.renderPredictions(predictions);
      requestAnimationFrame(() => {
        this.detectFrame(video, model);
      });
    });
  };

  receiveHeatData(data) {


    this.setData(data
    );
  }

  setData(data) {
    this.heatmap.setData({
      data: this.computeData(data)
    });
  }

  computeData(data) {

    let container = {};
    container.width = ReactDOM.findDOMNode(this.refs.heatContainer).offsetWidth;
    container.height = ReactDOM.findDOMNode(this.refs.heatContainer).offsetHeight;
    return data.map(function (values, index) {
      return {
        x: Math.round(values.x / 100 * container.width),
        y: Math.round(values.y / 100 * container.height),
        value: values.value
      }
    })

  }

  renderPredictions = predictions => {

    const ctx = this.canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // Font options.
    var arr = [];
    const font = "16px sans-serif";
    ctx.font = font;
    ctx.textBaseline = "top";
    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      const width = prediction.bbox[2];
      const height = prediction.bbox[3];


      if (prediction.class === "person") {
        arr.push({ x: (x + width / 2) / 10, y: (y + height / 2) / 10, value: 0 });
      }


      // Draw the bounding box.
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);
      // Draw the label background.
      ctx.fillStyle = "#00FFFF";
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x, y, textWidth + 4, textHeight + 4);
    });

    this.receiveHeatData(arr);

    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      // Draw the text last to ensure it's on top.
      ctx.fillStyle = "#000000";
      ctx.fillText(prediction.class, x, y);
    });
  };

  render() {
    const { classes } = this.props;
    return (

      <div style={{overflow:"hidden"}}>
        <AppBar position="static">
          <Toolbar style={{padding : 0}}>
        <img src="logo.png" style={{width:'40px',height:'40px'}}/>
            <Typography variant="h6" color="inherit" style={{textAlign:'center',paddingLeft:'40px'}}>
              SPOT
            </Typography>

          </Toolbar>
        </AppBar>

        <Grid container spacing={24} style={{padding:"40px"}}>
        <Grid item xs={6}>
            <Paper >
              <div>
                <video
                  className = "size"
                  autoPlay
                  playsInline
                  muted
                  ref={this.videoRef}
                  width="550"
                  height="550"
                  style={{marginTop:'-50px'}}
                />
                <canvas
                  className = "size"
                  ref={this.canvasRef}
                  width="550"
                  height="550"
                  style={{marginTop:'-50px'}}
                />
              </div>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper >
              <div ref="heatContainer" className="width">
              </div>
            </Paper>
          </Grid>
        </Grid>
        
      </div >
    );
  }
}
App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
