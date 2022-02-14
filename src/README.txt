  _  __            _______             _       _____                      
 | |/ /           |__   __|           | |     / ____|                     
 | ' / ___  ___ _ __ | |_ __ __ _  ___| | __ | (___  _ __   __ _  ___ ___ 
 |  < / _ \/ _ | '_ \| | '__/ _` |/ __| |/ /  \___ \| '_ \ / _` |/ __/ _ \
 | . |  __|  __| |_) | | | | (_| | (__|   < _ ____) | |_) | (_| | (_|  __/
 |_|\_\___|\___| .__/|_|_|  \__,_|\___|_|\_(_|_____/| .__/ \__,_|\___\___|
               | |                                  | |                   
               |_|                                  |_|                   
##########################################################################

Date: 8/18/2021

# Starting KeepTrack #####################################################

To run KeepTrack without a webserver you need to use Chrome and enable 
loading local files (--allow-file-access-from-files). There is a "Chrome 
With Local Files" shortcut included that should work without modification.
This will not open the index.html file automatically. You either need to add
the full path to the index file (ex. C:\KeepTrack\index.html) to the end of
the shortcut target or Try using the included KeepTrack.bat file. That file
will attempt to launch Chrome with the flag and open the index.html file
automatically.

The KeepTrack.lnk file is just an example of launching the .bat file with
a nice icon. You will need to update the link location to your .bat location
or it will not work. If you place the KeepTrack.SPace folder in a shared
location (network drive) and update the link, then users can copy that
link to their desktop and launch KeepTrack. There is no limit to the number
of copies that can be run simultaneously by users and after loading there
is no additional calls to the network drive.

# Settings ################################################################

The included ./settings/settings.js file contains a large list of flags and
parameters that are intended to be changed to fine tune your experience.

This may include adding a classification bar to the top of the page,
disabling some of the core plugins (ex. nextLaunch which requires internet),
or changing the color scheme.

Please reference the built in-line documentation within the file for an
explanation of what each setting does. If you hit a roadblock, please open
an issue on github (https://github.com/thkruz/keeptrack.space) or contact
me at theodore.kruczek@gmail.com.

# Updating the Catalog ####################################################

The catalog is initialized in three phases.

1) TLE.json - this loads the unclassified database containing TLEs, names,
launch dates, payload information, etc. This is the only file used on the
unclassified website.

2) extra.json - this loads a secondary database that can contain additional
information to augment and/or replace the TLE.json data. This will only
load if you are launching KeepTrack in the offline mode (with index.html)

3) TLE.txt - this loads the most up-to-date ELSETs when running offline.
Download TLEs in standard format:

1 25544U ..........
2 25544 .............
1 25545U ..........
2 25545 ............

And save them as TLE.txt inside the "tle" folder. KeepTrack will
automatically load this file and replace any TLEs in TLE.json or extra.js

# Questions ###############################################################

Please use the issues page on github 
(https://github.com/thkruz/keeptrack.space) or contact me at 
theodore.kruczek@gmail.com if you have a problem.