---
title: 'Advanced Services'
---

In addition to the [websites](/docs#our-services) we offer, your SCCS account gives you access to
several lower-level services. While a lot of these are offered mostly for historical reasons, they
still might be useful to you. As always, feel free to contact
[staff@sccs.swarthmore.edu](mailto:staff@sccs.swarthmore.edu) with any questions.

## SSH

We operate a SSH server at `ssh.swarthmore.edu`. You can sign in to the server with your SCCS
account and do anything that you can normally do on a remote server, including long-running
processes like web servers and file storage. The SSH server (currently a machine named Heron) runs
Ubuntu with a variety of packages installed; if you'd like something else installed, just let us
know. Also, just like any of our services, you'll keep your access and data after graduation.

We don't have a formal storage quota, but be reasonable, as we have a finite amount of backup space.
That said, if you've got lots of data that you don't really need multiple replicas of, we can
probably accomodate you up to a terabyte or so&mdash;just come
[talk to us](mailto:staff@sccs.swarthmore.edu) first so we can exclude those files from the backup
set.

The key fingerprints of our server are:

```
ssh.sccs.swarthmore.edu ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCx9vzUUyHrAsqo2PtmtCYIQUQxnVoXRWLfiePrWwy7Oc/hSri1RneqwN5qBguJo7FFWEUNq1n6zpxCgLfaxODX/c5RBRIzmHkKFzWs67Y0ABtsB0349gYoQPl0/sa1O+Fpmtkn96M9EXdW2OFceeyhL/bsuvnZoHdkiE+wlfIySeJuDfd2k7eIOUu2k2yM5WsxOiveOcF47Nc+4mwFQlHfo3fA8XoqEkzEyZX50imsDRWuNmlbVGrP3OfUlYY4NKaRTJ/j1Ou/QHprAUqJnQiAoUVj65BAEVmO6n37GYjkO3Zw2rQqYjN4dNrMOeh/sb1A0VUOlcxKUctCRkSgksMh
ssh.sccs.swarthmore.edu ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBA4fCJqvTX3ilmWc7gMVRDSh5ETjr+2CkKd5RmGN2BJcxmDDDJtrC9I2LM47lD+Dd4v7ehPlZ+LBCTnV8Gdn8WM=
ssh.sccs.swarthmore.edu ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL1DTcuz+cBEQ5/8BmPa8BXkdjxwL1aWq2ihoi21agqR
```

## Web Hosting

You can serve webpages (or any other file) from our servers. If you SSH in, you'll see a folder in
our home directory on our server called `web-docs`: anything in that folder will be accessible via
our Apache web server at `sccs.swarthmore.edu/users/[class year]/[username]/path/to/file`. For
example, if you're in the class of 2024 and your username is `phineas`, then the contents of your
`web-docs` folder will be accessible at `sccs.swarthmore.edu/users/24/phineas/`. You can also use a
tilde: `sccs.swarthmore.edu/~phineas/` will redirect to the same place.

## Email

Your SCCS account also gives you access to an email account hosted on our servers at
`[username]@sccs.swarthmore.edu`. This service is mostly offered for historical reasons, dating back
to an era where email accounts were associated with a specific machine and free email providers such
as Gmail didn't exist. You can technically use us as your only email provider (set up email
forwarding to forward to your SCCS mailbox and read mail via command line on our SSH server), but
this is an _extremely_ bad idea these days for a variety of reasons. If you need to receive mail to
your SCCS account (most often for cronjob results) it's a better idea to forward it to an existing
email account. You can do that [here](/account).

## Other

If you're a Swarthmore student and you have something else you'd like to do using our resources,
just let us know! We can host databases, set up websites for student organizations, or do plenty of
other things.
