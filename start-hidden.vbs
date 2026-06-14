' 콘솔 창 없이 펫을 실행합니다. (시작프로그램 폴더에 이 파일의 바로가기를 넣으면 부팅 시 자동 실행)
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run "cmd /c npm start", 0, False
