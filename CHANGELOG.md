## version 1.9 [2023-05-25]

- Нова можливість додати до назви файлу тривалість відео в хвилинах. Тривалість округляється до цілого числа.
- Якщо увімкнено функцію пошуку відео, тоді до списку відео що у лівій панелі, додається кольорова позначка, яка вказує на те, чи було вже завантажено файл. Ця позначка змінюється при завантаженні сторінки, а також після того, як всі файли буде завантажено. Статус завантажено було файл чи ні вираховується тільки на основі попередньо збереженого відеофайлу.
---
- New option to add a video duration in minutes to the file name. The duration is rounded to the nearest whole number.
- If the video search function is enabled, a color mark is added to the list of videos in the left pane to indicate whether the file has already been downloaded. This marker changes when the page loads and when all the files are uploaded. The status of whether a file has been uploaded or not is calculated based only on the previously saved video file.

## version 1.8:

- Search for videos in a list. Find the name of the video in the list in the left pane. And scroll through the list to the name of the current video. It is useful when the module has a large number of sections and you need to take the course again, but in a different language. https://youtu.be/ajOcopEuxGI

## version 1.7:

- For compatibility with some browsers, an alternative file download method has been added to the settings section. This can solve the problem of saving on some operating systems, such as earlier versions of macOS.
- The mechanism for counting saved files has been redesigned.
- Added information about a previously saved file when you hover over the name of this extension.
- Added an indicator that this is a new object to be saved. Green or red dot as a prefix to the title name.

## version 1.6:

- The mechanism for saving files has been redesigned, now it is done through the browser API.
- Added a background process to control notifications from processes about saving files.
- Added a counter of stored files and its decrease after the actual saving of these files.
- Control of saved files by yourself/others.
- Added a prefix with the course name to the file name
- Added automatic change to dark and light theme according to browser themes

## version 1.5:

- Displays information about all available additional languages for the current video when you hover over the video title.
- Added the option to store additional video description and subtitles in other languages. The list is separated by commas.
- Saves additional media files in all selected languages.
- Information about the generated file name is displayed when you hover over the save button.

## version 1.4:

- Using coursera API to get media information
- Added automatic file numbering within a single module
- Added a choice of video image quality
- Added a choice to store additional video transcript in another language

## version 0.0.1:

- Pilot version for Google Web Store
- parsing the HTML code of a video page and generating the same file name for all saved files of different types
