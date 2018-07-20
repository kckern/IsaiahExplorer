import React, {Component} from "react";
import StructureSetting from "./Settings/Structure";
import {globalData} from "../../globals";
import SortableList from './SortableList'
import {arrayMove} from 'react-sortable-hoc';

class StructureSettings extends Component {
  state = {entries: [], full: false, dragging: false}

  componentDidMount() {
    const {entries} = this.props
    this.setState({entries})
  }

  componentWillReceiveProps({entries}) {
    if (entries.length === this.props.entries.length && this.state.full) return null;
    this.setState({entries, full: true})
  }

  onSortStart = () => {
    this.setState({dragging: true});
  }

  onSortEnd = ({oldIndex, newIndex}) => {
    const {entries} = this.state
    const newEntries = arrayMove(entries, oldIndex, newIndex)
    this.setState({
      entries: newEntries,
      dragging: false
    });
    this.props.app.setNewTop("top_structures", newEntries[newIndex], newIndex)
  }


  render() {
    const {entries, dragging} = this.state
    const {app, settings} = this.props
    const iterated = entries
      .map((shortcode, optionKey) => {
        return (
          <StructureSetting
            app={app}
            settings={settings}
            option={globalData["meta"]["structure"][shortcode]}
            optionKey={optionKey}
            index={optionKey}
            key={shortcode}
            dragging={dragging}
          />
        )
      })
    iterated.splice(5, 0, (<h5 key="R" className="otherheading">Reserve Items</h5>))
    return <SortableList
      axis="y"
      lockAxis="y"
      entries={iterated}
      onSortStart={this.onSortStart}
      onSortEnd={this.onSortEnd}
      helperClass="option--dragging"
    />
  }
}

export default StructureSettings