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

$pattern = "/^\/(\d+)/i";
preg_match_all($pattern,$_SERVER['REQUEST_URI'],$matches);
if(!empty($matches[1]))
{
	$chapter 	= substr($matches[1][0], 0);
	$verse  	= 1;
}
$pattern = "/^\/(\d+)\/(\d+)/i";
preg_match_all($pattern,$_SERVER['REQUEST_URI'],$matches);
if(!empty($matches[1]))
{
	$chapter 	= substr($matches[1][0], 0);
	$verse  	= substr($matches[2][0], 0);
}


if(empty($chapter)) $chapter = 2;
if(empty($verse)) $verse = 1;
if(empty($outline)) $outline = "MEV";
if(empty($version)) $version = "KJV";

$cfig = ["versions"=>[strtoupper($version)=>strtoupper($outline)],"output"=>"text","headings"=>1,"single_heading"=>1];
$text = scriptures::lookup("Isaiah $chapter:$verse",$cfig);
$parts = preg_split("/\n+/",$text);


$ref = "Isaiah $chapter:$verse";
$heading = trim($parts[0]);
$description = trim($parts[1]);
$url = $_SERVER['HTTP_HOST'].$_SERVER['REDIRECT_URL'];


if(!empty($search)) $heading = "Search: ".ucwords($search);
if(!empty($hebrew)) $heading = "Hebrew Word Search";
if(!empty($tag))
{
	$tagdata = json_decode(file_get_contents("./core/tags.json"),1);
	$tagdata = $tagdata[substr($tag,4)]; 
	$heading = "Tag—".$tagdata[0];
	$description = $tagdata[1];
}
if(!empty($comment)) $heading = "Commentary";





?><!DOCTYPE html>
<html lang="en">

<head>
	<meta property="og:url"                content="<?=$url?>" />
	<meta property="og:type"               content="article" />
	<meta property="og:title"              content="<?=$ref?> | <?=$heading?>" />
	<meta property="og:description"        content="<?=$description?>" />
	<meta property="og:image"              content="http://<?=$_SERVER['HTTP_HOST']?>/cover<?=$_SERVER['REQUEST_URI']?>.jpg" />  
	<meta property="og:image:width"        content="1200" />
	<meta property="og:image:height"        content="630" />  
	
    <meta name="twitter:card" content="summary">
	<meta name="twitter:site" content="@IsaiahExplorer">
	<meta name="twitter:title" content="<?=$ref?> | <?=$heading?>">
	<meta name="twitter:description" content="<?=$description?>">
	<meta name="twitter:creator" content="@IsaiahExplorer">
	<meta name="twitter:image:src" content="http://<?=$_SERVER['HTTP_HOST']?>/scroll.jpg" />
	<meta name="twitter:domain" content="<?=$_SERVER['HTTP_HOST']?>">
	
	<title><?=$ref?> | <?=$heading?></title>
</head>

<body>
    <h1>Isaiah Explorer</h1>
    <h2><?=$ref?> (<?=strtoupper($version)?>)</h2>
    <h3><?=$heading?></h3>
    <p><?=$description?></p>
</body>

</html>

