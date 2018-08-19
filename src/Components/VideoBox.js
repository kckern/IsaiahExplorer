import React, { Component } from "react";


export default class VideoBox extends Component {
	
	
	render()
	{
	
		return <div id="videobox">
		<iframe 
			width="1280" 
			height="720" 
			src="https://www.youtube.com/embed/?listType=playlist&list=PLDC0nTbURSOpgH_MVnAX63fjtXidqVwvn&rel=0&autoplay=1" 
			frameborder="0" 
	        allowfullscreen="allowfullscreen"
	        mozallowfullscreen="mozallowfullscreen" 
	        msallowfullscreen="msallowfullscreen" 
	        oallowfullscreen="oallowfullscreen" 
	        webkitallowfullscreen="webkitallowfullscreen"></iframe>
		</div>	
	}
}