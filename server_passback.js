var sql = require('./server/public_sql');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var express = require('express');
var svgCaptcha = require('svg-captcha');

var server = express(); //使用express框架
var pool = sql.createPool({
	host: '132.232.169.227',
	user: 'god',
	port: 3306,
	password: 'godmanager',
	database: 'recruitment'
});
//创建数据库连接池

server.use(cookieParser('sadssdasdasdasd'));
//为cookie添加签名，防篡改

var arr = [];
for (var i = 0; i < 10000; i++) {
	arr.push(Math.random() * 9999999 + "");
}
//生成加密数组作为秘钥
server.use(cookieSession({
	name: 'sess', //session名称
	keys: arr, //手动设置session密钥.这个秘钥必须是字符串数组
	maxAge: 5 * 60 * 1000 //手动设置session过期时间，单位为毫秒

}));
//设置session


server.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", 'http://127.0.0.1:8848'); //需要显示设置来源
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Credentials", true); //带cookies7     res.header("Content-Type", "application/json;charset=utf-8");
	next();
});
//处理跨域


server.use('/picyzm', function(req, res) {
	canvas(req, res);
})
//请求--图片验证码

function canvas(req, res) {
	var codeConfig = {
		size: 4, // 验证码长度
		ignoreChars: '0o1il', // 验证码字符中排除 0o1i
		noise: 2, // 干扰线条的数量
		width: 100,
		viewwidth: 150,
		height: 28,
		viewheight: 40,
	}
	var captcha = svgCaptcha.create(codeConfig);
	req.session.picyzm = captcha.text.toLowerCase(); //存session用于验证接口获取文字码
	console.log(captcha.text.toLowerCase());
	res.send(JSON.stringify({
		pic: captcha.data,
		style: 1
	}));
	res.end();
}
//绘制验证码，并发送图片

server.post('/phone', function(req, res) {
	var obj = {};
	var message = '';
	req.on('data', function(data) {
		message += data;
	})
	req.on('end', function() {
		obj = querystring.parse(message);
		if (!rexPhone(obj.phone)) {
			res.write(JSON.stringify({
				msg: "其他异常！",
				style: -3
			}));
			res.end();
		} else if (req.session.picyzm == undefined) {
			res.write(JSON.stringify({
				msg: "图片验证码已失效，请重新验证！",
				style: -1
			}));
			res.end();
		} else if (obj.picyzm.toLocaleLowerCase() != req.session.picyzm) {
			res.write(JSON.stringify({
				msg: "图片验证码错误，请再次验证！",
				style: 0
			}));
			res.end();
		} else {
			req.session.phone = obj.phone;
			var sqlString = sql.select(['phoneNum'], 'registryinformation', "phoneNum=" + sql.escape(obj.phone));
			sql.sever(pool, sqlString, end); //数据库电话号码查重
		}
	})

	function end(data) {
		if (data.length == 1) {
			req.session.yzm = "" + parseInt(Math.random() * 9.9999) + parseInt(Math.random() * 9.9999) + parseInt(Math.random() *
				9.9999) + parseInt(Math.random() * 9.9999) + parseInt(Math.random() * 9.9999) + parseInt(Math.random() * 9.9999);
			req.session.picyzm = null; //成功后验证码失效
			res.write(JSON.stringify({
				msg: "短信已发送！",
				style: 1
			}));
			console.log("发送短信" + req.session.yzm);
			//mailepass(obj.phone,req.session.yzm);//发送邮件--->替换短信--->密码找回
			res.end();
		} else {
			req.session.picyzm = null;
			res.write(JSON.stringify({
				msg: "此手机号没有注册！",
				style: -2
			}));
			res.end();
		}
	}
})
//请求--手机号验证（发送密码找回短信）

server.post('/passback', function(req, res) {
	var obj = {};
	var message = '';
	req.on('data', function(data) {
		message += data;
	})
	req.on('end', function() {
		obj = querystring.parse(message);
		if (req.session.yzm == undefined) {
			res.write(JSON.stringify({
				msg: "验证码已失效，请重新验证！",
				style: -1
			}));
			res.end();
		} else if (obj.yzm != req.session.yzm) {
			res.write(JSON.stringify({
				msg: "验证码错误，请再次验证！",
				style: 0
			}));
			res.end();
		} else {
			var sqlString = sql.update('registryinformation', ['password'], [sql.escape(obj.password)],
				"phoneNum="+sql.escape(req.session.phone));
			sql.sever(pool, sqlString, end); //数据库修改session对应的密码
		}
	})

	function end(data) {
		req.session.yzm = null; //成功后验证码失效
		res.write(JSON.stringify({
			msg: "修改成功！",
			style: 1
		}));
		res.end();
	}
})
//请求--注册信息



server.listen(8082);

function rexPhone(text) {
	var reg = /^1[0-9]{10}$/;
	return reg.test(text);
}
//11位电话

function rexXuehao(text) {
	var reg = /^[0-9]{8}$/;
	return reg.test(text);
}
//通用学号