var scrollKey = setInterval(function () {
    window.scrollTo(0,document.body.scrollHeight);
    $("#getMore").click();
},1000);

$(".graphList-result .list").each(function () {
    console.log($(this).find("img").attr("src"))
})