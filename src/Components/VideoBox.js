import React, { Component } from "react";


export default class VideoBox extends Component {
	
	
	render()
	{
	
		return <div id="videobox">
		<iframe 
			title="tutorial"
			width="1280" 
			height="720" 
			src="https://www.youtube.com/embed/?listType=playlist&list=PL5uue7Psfp-xw-rS0cP4UBEeUu4w7Yoav&rel=0&autoplay=1" 
			frameborder="0" 
	        allowfullscreen="allowfullscreen"
	        mozallowfullscreen="mozallowfullscreen" 
	        msallowfullscreen="msallowfullscreen" 
	        oallowfullscreen="oallowfullscreen" 
	        webkitallowfullscreen="webkitallowfullscreen"></iframe>
		</div>	
	}
}