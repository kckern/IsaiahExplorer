<?php


require_once( "/var/www/kckern.info/lifelog/core/bootstrap.php");

// Path to our font file
$size = 50;


$pattern = "/^\/cover(\/[^\/]+)(\/[^\/]+)(\/[^\/]+)(\/tag.[^\/]+)*(\/search.[^\/]+)*(\/hebrew.[0-9]+)*(\/[0-9]+)(\/[0-9]+)(\/commentary.[^\/]+)*(\/[0-9]+)*/i";

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

$pattern = "/^\/cover\/(\d+)/i";
preg_match_all($pattern,$_SERVER['REQUEST_URI'],$matches);
if(!empty($matches[1]))
{
	$chapter 	= substr($matches[1][0], 0);
	$verse  	= 1;
}
$pattern = "/^\/cover\/(\d+)\/(\d+)/i";
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


$ref = "Isaiah $chapter:$verse";

if(!empty($tag))
{
	$tagdata = json_decode(file_get_contents("./core/tags.json"),1);
	$tagdata = $tagdata[substr($tag,4)]; 
	$ref = "Tag—".trim(preg_replace("/[^A-z0-9()\[\]]+/"," ",$tagdata[0]));
	$description = $tagdata[1];
}
if(!empty($search))
{
	$ref = "Search—".ucwords(substr($search,7));
}
if(!empty($hebrew))
{
	$ref = "Hebrew Word Search #".(substr($hebrew,7));
}
if(!empty($comment))
{
	$ref = "Commentary on $ref";
}

$ver = strtolower($version);

// Create a 300x150 image
$im = imagecreatefromjpeg("scroll.jpg");


$black = imagecolorallocatealpha($im, 0, 0, 0, 30);
$white = imagecolorallocate($im, 255, 255, 255);
$light = imagecolorallocatealpha($im, 255, 255, 230,40);
$dark = imagecolorallocate($im, 0, 0, 0);

// Set the background to be white
imagefilledrectangle($im, 0, 0, 1200, 50, $light);
imagefilledrectangle($im, 0, 50, 1200, 250, $black);


$font = './goudybol.ttf';
$path = "/var/www/hosting/scripture.guide/img/covers/$ver.jpg";
$fore = imagecreatefromjpeg($path);
$fore_y = imagesy($fore);
$fore_x = imagesx($fore);
$back_y = imagesy($im);
$back_x = imagesx($im);

imagecopymerge($im, $fore, ($back_x/2)-($fore_x/2),80, 0, 0, $fore_x, $fore_y, 100); //have to play with these numbers for it to work for you, etc.



$bbox = imagettfbbox($size, 0, $font, $ref);
$x = $bbox[0] + (imagesx($im) / 2) - ($bbox[4] / 2) - 0;
$y = $bbox[1] + (imagesy($im) / 2) - ($bbox[5] / 2) - 0;
imagettftext($im, $size, 0, $x, 200, $white, $font, $ref);


$size = 20;
$bbox = imagettfbbox($size, 0, $font, "I S A I A H      E X P L O R E R");
$x = $bbox[0] + (imagesx($im) / 2) - ($bbox[4] / 2) - 0;
$y = $bbox[1] + (imagesy($im) / 2) - ($bbox[5] / 2) - 0;
imagettftext($im, $size, 0, $x, 33, $dark, $font,  "I S A I A H      E X P L O R E R");




// Output to browser
header('Content-Type: image/png');

imagepng($im);
imagedestroy($im);
?>