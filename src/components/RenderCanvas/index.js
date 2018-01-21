import React, { Component } from 'react'
import './index.css'
import _ from 'lodash'
import Toggle from 'react-toggle'
import { Tooltip } from 'react-tippy'
import axios from 'axios'
import 'rc-slider/assets/index.css'
import 'rc-tooltip/assets/bootstrap.css'
import 'react-tippy/dist/tippy.css';
import RcTooltip from 'rc-tooltip'
import Slider from 'rc-slider'
import GenericCanvasElement from './GenericCanvasElement'
import CharacterCanvasElement from './CharacterCanvasElement'
import Draggable, { DraggableCore } from 'react-draggable'
import { NotificationManager } from 'react-notifications'

const renderFootholds = JSON.parse(localStorage['isDebugMode'] || 'false') === true

class RenderCanvas extends Component {
  constructor(props) {
    super(props)
    this.state = {
      x: 0,
      y: 0,
      childDragCount: 0
    }

    if (props.selectedRenderable !== undefined) {
      const renderable = props.renderables[props.selectedRenderable]
      if (renderable){
        this.state = {
          ...this.state,
          x: Math.round(-renderable.position.x),
          y: Math.round(-renderable.position.y)
        }
      }
    }

    if (props.mapId) {
      axios.get(`https://labs.maplestory.io/api/gms/latest/map/${props.mapId}`)
        .then(response => this.setState({mapData: response.data}))
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.focusRenderable !== this.props.focusRenderable){
      const { focusRenderable, mapId } = this.props
      const { mapData } = this.state

      const renderable = this.props.renderables[focusRenderable]
      if (renderable)
        this.setState({ x: -renderable.position.x + (mapData ? mapData.graphicBounds.x : 0), y: -renderable.position.y + (mapData ? mapData.graphicBounds.y : 0) })
    }
    if (prevProps.mapId != this.props.mapId && this.props.mapId) {
      axios.get(`https://labs.maplestory.io/api/gms/latest/map/${this.props.mapId}`)
        .then(response => {
          let stateChanges = {
            mapData: response.data
          };

          if (this.state.mapData === undefined) {
            const { focusRenderable, mapId } = this.props
            const { mapData } = stateChanges

            const renderable = this.props.renderables[focusRenderable]
            if (renderable)
              stateChanges = {
                ...stateChanges,
                x: Math.round(-renderable.position.x + (mapData ? mapData.graphicBounds.x : 0)),
                y: Math.round(-renderable.position.y + (mapData ? mapData.graphicBounds.y : 0))
              }
          }

          this.setState(stateChanges)
        })
    }
  }

  render() {
    const { renderables, mapId, zoom, backgroundColor } = this.props
    const { mapData } = this.state
    const mapOrigin = {}

    const styleOptions = { transform: `translate(${this.state.x}px, ${this.state.y}px) translateZ(0)` }
    if (zoom != 1) styleOptions.transform = styleOptions.transform + ` scale(${zoom})`

    if (mapData) mapOrigin.transform = `translate(${-mapData.graphicBounds.x}px, ${-mapData.graphicBounds.y}px)`

    return (
      <div className={'canvas-bg' + (this.state.dragging ? ' dragging' : '')} style={{ backgroundPositionX: `${this.state.x}px`, backgroundPositionY: `${this.state.y}px` }}>
        <DraggableCore
          onDrag={(e, o) => {
            if(!this.state.childDragging && (e.target.classList.contains('canvas-characters') || e.target.classList.contains('map')))
              this.setState({ x: this.state.x + o.deltaX, y: this.state.y + o.deltaY, dragCount: (this.state.dragCount || 0) + 1 })
          }}
          onStart={(function() { this.setState({ dragging: true, dragCount: 0 }); console.log('dragging') }).bind(this)}
          onStop={(function() { this.setState({ dragging: false }); console.log('done') }).bind(this)}
          >
          <div className={'canvas-characters' + (this.state.dragging ? ' dragging' : '')} onClick={this.clickCanvas.bind(this)} style={{ backgroundColor }}>
            <div className={'renderables-container' + (this.state.dragging ? ' dragging' : '')} style={styleOptions}>
            {
              mapId ? <img className='map' src={`https://labs.maplestory.io/api/gms/latest/map/${mapId}/render`} draggable={false} onClick={this.clickCanvas.bind(this)} onError={this.mapLoadingError} /> : ''
            }
            {
              (mapData && renderFootholds) ? <svg className='map' onClick={this.clickCanvas.bind(this)} width={mapData.graphicBounds.width} height={mapData.graphicBounds.height} viewBox={`${mapData.graphicBounds.x} ${mapData.graphicBounds.y} ${mapData.graphicBounds.width} ${mapData.graphicBounds.height}`}>{
                ((_.values(mapData.footholds) || []).map((fh, i) =>
                  <line x1={fh.x1} x2={fh.x2} y1={fh.y1} y2={fh.y2} strokeWidth='2' stroke='black' key={'svg' + i} />
                ))
              }</svg> : ''
            }
              <div style={mapOrigin} className='character-container'>
                {
                  renderables
                    .filter(renderable => renderable.visible)
                    .map((renderable, i) => {
                      return this.getRenderableElement(renderable, i)
                    })
                }
              </div>
            </div>
          </div>
        </DraggableCore>
      </div>
    )
  }

  clickCanvas(e) {
    if (!this.state.dragCount)
      this.props.onClick(e)
  }

  getRenderableElement(renderable, index) {
    const { selectedRenderable } = this.props
    return renderable.type == 'character' ? (
    <CharacterCanvasElement
      onStart={this.childDragging.bind(this)}
      onStop={this.childStopDragging.bind(this)}
      onClick={(function (){
        if (this.state.childDragCount === 0)
          this.props.onClickRenderable(renderable)
      }).bind(this)}
      onUpdateRenderablePosition={this.handleRenderableElementMovement.bind(this, renderable)}
      character={renderable}
      summary={renderable.summary}
      selected={selectedRenderable === index}
      key={'canvas' + renderable.id} />
    ) : (
    <GenericCanvasElement
      onStart={this.childDragging.bind(this)}
      onStop={this.childStopDragging.bind(this)}
      onClick={(function (){
        if (this.state.childDragCount === 0)
          this.props.onClickRenderable(renderable)
      }).bind(this)}
      onUpdateRenderablePosition={this.handleRenderableElementMovement.bind(this, renderable)}
      renderable={renderable}
      summary={renderable.summary}
      selected={selectedRenderable === index}
      key={'canvas' + renderable.id} />
    )
  }

  handleRenderableElementMovement(renderable, o,e) {
    if (!e.deltaX && !e.deltaY) return

    const { zoom } = this.props
    const { mapData } = this.state
    const footholds = _.values((mapData || {}).footholds)

    const { deltaX, deltaY } = e
    const cursorX = e.x, cursorY = e.y
    this.setState({ childDragCount: this.state.childDragCount + 1 })
    renderable.position = renderable.position || { x:0, y:0 }
    if(Number.isNaN(renderable.position.x)) renderable.position.x = 0
    if(Number.isNaN(renderable.position.y)) renderable.position.y = 0
    let { x, y } = renderable.position
    x = Math.round(cursorX / zoom);
    y = Math.round(cursorY / zoom);
    if (footholds && renderable.fhSnap) {
      const validFootholds = footholds.filter(fh => {
        const isVertical = fh.x1 == fh.x2
        const isWithin = (fh.x1 < x && fh.x2 > x) || (fh.x2 < x && fh.x1 > x)
        if (isVertical || !isWithin) return false
        const { x1, x2, y1, y2 } = fh
        const yAtX = (x == x1 || x2 == x1 || y2 == y1) ? y1 : (y1 + ((y2 - y1) * ((x - x1) / (x2 - x1))))
        return Math.abs(yAtX - y) < 50
      })

      const alignedFootholds = validFootholds.map(fh => {
        const { x1, x2, y1, y2 } = fh
        const yAtX = (x == x1 || x2 == x1 || y2 == y1) ? y1 : (y1 + ((y2 - y1) * ((x - x1) / (x2 - x1))))
        return {
          ...fh,
          yAtX,
          difference: Math.abs(yAtX - y)
        }
      })

      const snapFoothold = _.find(alignedFootholds, fh => fh.difference < 50)
      if (snapFoothold) y = snapFoothold.yAtX
    }
    this.props.onUpdateRenderable(renderable, {
      position: {
        x,
        y
      }
    })
  }

  mapLoadingError() {
    NotificationManager.warning(`There was an error rendering that map`, '', 10000)
  }

  childDragging() { this.setState({childDragging: true, childDragCount: 0}) }
  childStopDragging() { this.setState({childDragging: false}) }
}

export default RenderCanvas
