<?

require_once( "/var/www/kckern.info/core/bootstrap.php");

$pattern = "/^(\/[^\/]+)(\/[^\/]+)(\/[^\/]+)(\/tag.[^\/]+)*(\/search.[^\/]+)*(\/hebrew.[0-9]+)*(\/[0-9]+)(\/[0-9]+)(\/commentary.[^\/]+)*(\/[0-9]+)*/i";

preg_match_all($pattern,$_SERVER['REQUEST_URI'],$matches);


$structure 	= substr($matches[1][0], 1);
$outline 	= substr($matches[2][0], 1);
$version 	= substr($matches[3][0], 1);
$tag 		= substr($matches[4][0], 1);
$search 	= substr($matches[5][0], 1);
$hebrew 	= substr($matches[6][0], 1);
$chapter 	= substr($matches[7][0], 1);
$verse  	= substr($matches[8][0], 1);
$comment  	= substr($matches[9][0], 1);
$commid  	= substr($matches[10][0], 1);


$r = scriptures::lookup("Isaiah $chapter:$verse",["version"=>["$version"=>"$outline"]]);

//puke($r);


$ref = "Isaiah 45:12";
$heading = "The Mountain of the Lord";
$description = "Suddenly, in an instant, your crowds of evildoers shall become as fine dust, your violent mobs like flying chaff. She shall be chastened by Jehovah of Hosts with thunderous quakings, resounding booms, tempestuous blasts and conflagrations of devouring flame.";
$url = $_SERVER['HTTP_HOST']."/".$_SERVER['REDIRECT_URL'];


?><!DOCTYPE html>
<html lang="en">

<head>
	<meta property="og:url"                content="<?=$url?>" />
	<meta property="og:type"               content="article" />
	<meta property="og:title"              content="<?=$ref?> | <?=$heading?>" />
	<meta property="og:description"        content="<?=$description?>" />
	<meta property="og:image"              content="http://<?=$_SERVER['HTTP_HOST']?>/scroll.jpg" />    
	
	
    <meta name="twitter:card" content="summary">
	<meta name="twitter:site" content="@IsaiahExplorer">
	<meta name="twitter:title" content="<?=$ref?> | <?=$heading?>">
	<meta name="twitter:description" content="<?=$description?>">
	<meta name="twitter:creator" content="@IsaiahExplorer">
	<meta name="twitter:image:src" content="http://<?=$_SERVER['HTTP_HOST']?>/scroll.jpg" />
	<meta name="twitter:domain" content="<?=$_SERVER['HTTP_HOST']?>">
	
	<title>Isaiah Explorer</title>
</head>

<body>
    <h1>Isaiah Explorer</h1>
</body>

</html>
