FROM ubuntu:20.04

RUN dpkg --add-architecture i386; apt update; apt install -y curl wget file tar bzip2 gzip unzip bsdmainutils python util-linux ca-certificates binutils bc jq tmux netcat lib32gcc1 lib32stdc++6 libsdl2-2.0-0:i386 speex:i386 libtbb2 python3 cpio

RUN apt-get install -y software-properties-common
RUN add-apt-repository multiverse
RUN dpkg --add-architecture i386
RUN apt update
RUN apt install -y steam
RUN echo steam steam/question select "I AGREE" | debconf-set-selections
RUN echo steam steam/license note '' | debconf-set-selections
RUN apt install -y steamcmd

RUN useradd -ms /bin/bash ns2server
USER ns2server
WORKDIR /home/ns2server

RUN wget -O linuxgsm.sh https://linuxgsm.sh && chmod +x linuxgsm.sh && bash linuxgsm.sh ns2server

RUN mkdir /home/ns2server/lgsm/config-lgsm
RUN mkdir /home/ns2server/lgsm/config-lgsm/ns2server

RUN echo 'steamuser="mustackserver"\n\
steampass="F5h8G3QQVvcp"\n\
stats="on"' > /home/ns2server/lgsm/config-lgsm/ns2server/common.cfg

RUN echo 'startparameters="-name "${servername}" -port ${port} -webadmin -webdomain ${ip} -webuser ${webadminuser} -webpassword "${webadminpass}" -webport ${webadminport} -map ${defaultmap} -limit ${maxplayers} -config_path "${servercfgdir}" -logdir "${gamelogdir}" -modstorage "${modstoragedir}" -mods "${mods}" -password \"mustack\""' > /home/ns2server/lgsm/config-lgsm/ns2server/ns2server.cfg

RUN ./ns2server auto-install
# RUN ./ns2server start