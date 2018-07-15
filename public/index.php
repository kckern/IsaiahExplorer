<?


$useragent=$_SERVER['HTTP_USER_AGENT'];
if(
	preg_match('/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i',$useragent))
{

	echo file_get_contents("mobile.html"); exit;
}

if (
    stripos($useragent, "facebookexternalhit/") !== false ||          
    stripos($useragent, "Facebot") !== false ||          
    stripos($useragent, "twitter") !== false
) {
    // it is probably Facebook's bot
    require("server.php");
}
else {
    // that is not Facebook
	echo file_get_contents("index.html");
}