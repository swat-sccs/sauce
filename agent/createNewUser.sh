#!/bin/bash

set -e

# utility function
echoerr() { echo "$@" 1>&2; }

user=$1
class=$2

homedir="/home/$class/$user/"
webdir="/srv/users/$class/$user/"
spool="/home/var/spool/mail/$user"

ensurenew() {
  if [ -d $1 ]; then
    echoerr "$1 already exists"
    exit 1
  fi
}

ensurenew $homedir
ensurenew $webdir
ensurenew $spool

echo "Creating user directories"

mkdir -p $homedir
mkdir -p $webdir
touch $spool

echo "Creating mail symlinks"

ln -s $spool "$homedir/.mail"
ln -s "$homedir/.mail" "$homedir/.mailbox"
ln -s $webdir "$homedir/web-docs"

echo "Setting permissions"
chown -R "$user:staff" $homedir
chown "$user:staff" $webdir

chmod -R 0700 $homedir

chmod 660 $spool
chown "$user:staff" $spool

echo "Updating Postfix"
/etc/postfix/make_vam.sh
/usr/sbin/postfix reload