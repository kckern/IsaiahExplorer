import React, { useContext, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { DataContext } from "../DataContext";



export default function Audio() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	if(state.audioState===null) return null;
	if(state.commentaryAudioMode) return <AudioCommentaryPlayer />
	return <AudioVersePlayer />
}
	

function AudioVersePlayer() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	var audioPointerRef = useRef(0);

	useEffect(() => {
		if(state.audioPointer===audioPointerRef.current) return;
		app.setState({audioPointer:audioPointerRef.current});
	});

	if(globalData.meta.version[state.version].audio!==1 && !state.version.hebrewMode) return null;
		
		//Queue Management
		var version = state.version;
		if(state.hebrewMode) version = "HEBREW";
		var url = "https://audio.scripture.guide/"+version+"/"+state.active_verse_id;
		var next_url = url;
		var next = null;
		var audioPointer = state.audioPointer;
		var index = -1;
		while(index===-1 && audioPointer>=0)
		{
			 index = state.highlighted_verse_range.indexOf(state.active_verse_id,audioPointer);
			 audioPointer--;
		}
		 if((index+1)<state.highlighted_verse_range.length)  { 
		 	next = state.highlighted_verse_range[index+1];
		 	next_url =  "https://audio.scripture.guide/"+version+"/"+next;
		 }
		if(index>=0) audioPointer=index;
		audioPointerRef.current = audioPointer;
		
		//Call Backs
		var onStart = ()=>{
			app.setState({    
			selected_verse:null,    
			audioState:"playing"})
		}
		var onEnded = (next)=>{


		  	if(next===null || 
		  	state.highlighted_verse_range.indexOf(state.active_verse_id)<0 || 
		  	state.highlighted_verse_range.indexOf(next)<0)
		  	{
		  		return app.setState({  audioState:null },app.setUrl.bind(app));
		  	}
		  	else{
		  		
		  		  	var index = -1
				  	var nexter = 0;
				  	if(app.arrowPointer===null) app.arrowPointer = 0;
					for(var pointer = app.arrowPointer; index===-1 && pointer>=0; pointer--)
						index = state.highlighted_verse_range.indexOf(state.active_verse_id,pointer);
					index++;
					if(index>=state.highlighted_verse_range.length) index = 0;
					nexter = state.highlighted_verse_range[index]; 
					app.arrowPointer = audioPointerRef.current = index;
		  		
		  			app.setActiveVerse(nexter,undefined,undefined,true,"audio");
		  		
		  	} 
		  	
		} 

		return <span><ReactPlayer className='react-player'
          	width='0%'
          	height='0%'
			key={11}
			url={url}
			playing={true} 
			onStart={onStart}
			playbackRate={state.playbackRate || 1}
			onEnded={onEnded.bind(null,next)}
		/><ReactPlayer  className='react-player'
          	width='0%'
          	height='0%'
			key={12}
			url={next_url}
			playing={true}
			volume={0}
			playbackRate={state.playbackRate || 1}
			muted={true}
		/></span>
	

}


function AudioCommentaryPlayer() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	var audioPointerRef = useRef(0);
	var hVersesRef = useRef([]);

	var lookupVerses = (verses) => {
		if(verses===undefined) return false;
		if(verses.length===0)  return false;
		

			app.setState({
				commentary_audio_verse_range:verses,
				comSearchMode:false},
				app.setActiveVerse.bind(app,verses[0],undefined,undefined,undefined,"audio"));

	};

	useEffect(() => {
		if(state.audioPointer===audioPointerRef.current) return;
		var callback = lookupVerses.bind(null,hVersesRef.current);
		app.setState({audioPointer:audioPointerRef.current},callback);
	});

	// URL for Commentary https://isaiah.scripture.guide/commentary/gileadi/Isaiah_01.1.mp3
			var verse_id = state.active_verse_id;
			if(state.commentary_audio_verse_range.length>0) verse_id = state.commentary_audio_verse_range[0];
			
			
			var commentaryAudio = state.commentaryAudio;
			if(globalData.commentary_audio.files[state.commentaryAudio]===undefined) commentaryAudio = "gileadi";
			
			var filename = globalData.commentary_audio.index[verse_id][commentaryAudio];
			var url = "https://scripture.guide/mp3/commentary/"+commentaryAudio+"/"+filename;
			
			var keys = Object.keys(globalData.commentary_audio.files[commentaryAudio]);
			var com_index = keys.indexOf(filename[0]);
			audioPointerRef.current=com_index;
			var nextfile = keys[com_index+1];
			if(nextfile===undefined) return null;
			var next_url = "https://scripture.guide/mp3/commentary/"+commentaryAudio+"/"+nextfile;
			hVersesRef.current = globalData.commentary_audio.files[commentaryAudio][filename];
			var nh_verses = globalData.commentary_audio.files[commentaryAudio][nextfile];
			var next = nh_verses[0];
			//set highlight verses
			
			if(hVersesRef.current===undefined)
			{
				//debugger;
				return false;
			}
			
			var onStart = ()=>{
				app.setState({    
				selected_verse:null,
				commentary_audio_verse_range: hVersesRef.current,
				audioState:"playing"});
				
				//preload next
			}
		
		
		var onEnded = (next)=>{
		  	if(next===null || next===undefined) return app.setState({  audioState:null,commentary_audio_verse_range:[] });
		  	
		  	app.setActiveVerse(next,undefined,undefined,"force","comaudio");
		  	
		  	
		}
		
		return <span><ReactPlayer className='react-player'
          	width='0%'
          	height='0%'
			key={21}
			url={url}
			playing={true} 
			onStart={onStart}
			playbackRate={state.playbackRate || 1}
			onEnded={onEnded.bind(null,next)}
		/><ReactPlayer  className='react-player'
          	width='0%'
          	height='0%'
			key={22}
			url={next_url}
			playing={true}
			volume={0}
			playbackRate={state.playbackRate || 1}
			muted={true}
		/></span>
	

}

	