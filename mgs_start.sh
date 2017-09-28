#!/bin/bash

PID=`ps -ef | grep ffmpeg | grep -v grep | awk '{print $2}'`
if [ "" !=  "$PID" ]; then
    kill -9 $PID
fi

PID=`ps -ef | grep node | grep -v grep | awk '{print $2}'`
if [ "" !=  "$PID" ]; then
    kill -9 $PID
fi

PID=`ps -ef | grep easydarwin | grep -v grep | awk '{print $2}'`
if [ "" !=  "$PID" ]; then
    kill -9 $PID
fi

/home/petrochina/manageragent/rtspserver/easydarwin -c /home/petrochina/manageragent/rtspserver/easydarwin.xml &

cd /home/petrochina/manageragent/controller/
nohup node index.js 1>./std.out 2>./error.out & #1>/dev/null 2>/dev/null &
