<?

$ip = @$_SERVER['HTTP_CLIENT_IP'] ?: @$_SERVER['HTTP_X_FORWARDED_FOR'] ?: @$_SERVER['REMOTE_ADDR'];

$useragent=$_SERVER['HTTP_USER_AGENT'];
if(
	preg_match('/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i',$useragent))
{

	echo file_get_contents("mobile.html"); exit;
}
if(preg_match("/^\/cover/ui",$_SERVER['REQUEST_URI']))
{
	require("image.php"); exit;
}
else if (
    stripos($useragent, "facebookexternalhit/") !== false ||          
    stripos($useragent, "Facebot") !== false ||          
    stripos($useragent, "twitter") !== false  ||       
    stripos($useragent, "googlebot") !== false  ||          
    $_SERVER['HTTP_HOST'] == "seo.isaiah.scripture.guide" 
) {
    // it is probably Facebook's bot
    require("server.php");
}
else {
    // that is not Facebook
	$html = file_get_contents("index.html");
	$html = str_replace('="./','="/',$html);
	echo $html;
}