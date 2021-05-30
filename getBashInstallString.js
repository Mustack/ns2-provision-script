export function getBashInstallString({
  ip,
  dropletId,
  delayInSeconds,
  STEAM_USERNAME,
  STEAM_PASSWORD,
  NS2_SERVER_PASSWORD,
  DIGITAL_OCEAN_TOKEN,
}) {
  return `ssh root@${ip} -o StrictHostKeyChecking=no << EOF 
    tmux new -d -s deletemux "sleep ${delayInSeconds}; curl -X DELETE -H "Content-Type: application/json" -H "Authorization: Bearer ${DIGITAL_OCEAN_TOKEN}" "https://api.digitalocean.com/v2/droplets/${dropletId}""  
    
    sudo su
    
    dpkg --add-architecture i386; apt update; apt install -y curl wget file tar bzip2 gzip unzip bsdmainutils python util-linux ca-certificates binutils bc jq tmux netcat lib32gcc1 lib32stdc++6 libsdl2-2.0-0:i386 speex:i386 libtbb2 python3 cpio software-properties-common iproute2
    
    add-apt-repository multiverse
    dpkg --add-architecture i386
    apt update
    apt install -y steam
    echo steam steam/question select "I AGREE" | debconf-set-selections
    echo steam steam/license note '' | debconf-set-selections
    apt install -y steamcmd
    
    useradd -ms /bin/bash ns2server
    
    su - ns2server
    
    wget -O linuxgsm.sh https://linuxgsm.sh && chmod +x linuxgsm.sh && bash linuxgsm.sh ns2server
    
    mkdir /home/ns2server/lgsm/config-lgsm
    mkdir /home/ns2server/lgsm/config-lgsm/ns2server
    
    echo 'steamuser="${STEAM_USERNAME}"
    steampass="${STEAM_PASSWORD}"
    stats="on"' > /home/ns2server/lgsm/config-lgsm/ns2server/common.cfg
    
    ./ns2server auto-install

    echo 'startparameters="-name "\\\${servername}" -port "\\\${port}" -webadmin -webdomain "\\\${ip}" -webuser "\\\${webadminuser}" -webpassword "\\\${webadminpass}" -webport "\\\${webadminport}" -map "\\\${defaultmap}" -limit "\\\${maxplayers}" -config_path "\\\${servercfgdir}" -logdir "\\\${gamelogdir}" -modstorage "\\\${modstoragedir}" -mods "\\\${mods}" -password "${NS2_SERVER_PASSWORD}""' > /home/ns2server/lgsm/config-lgsm/ns2server/ns2server.cfg
    
    ./ns2server start
  `;
}
