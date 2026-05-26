from prompt_toolkit.shortcuts import radiolist_dialog

class TerminalModeDialogs:
    def __init__(self, chatbot):
        self.chatbot = chatbot

    def getValidOptions(self, options, title, default, text):
        result = radiolist_dialog(
            title=title,
            text=text,
            values=[(option, option) for option in options],
            default=default,
        ).run()
        return result
