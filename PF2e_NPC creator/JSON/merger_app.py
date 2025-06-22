import os
import json
import tkinter as tk
from tkinter import filedialog, messagebox

# --- Jádro logiky pro spojování souborů (z původního skriptu) ---
def merge_json_files(input_folder, output_file):
    """
    Načte všechny .json soubory z vstupní složky a spojí je do jednoho výstupního souboru.
    Vrací počet zpracovaných souborů nebo chybovou hlášku.
    """
    all_data = []
    try:
        for filename in os.listdir(input_folder):
            if filename.endswith('.json'):
                file_path = os.path.join(input_folder, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    all_data.append(data)

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)
        
        return len(all_data)
    except Exception as e:
        return f"Došlo k chybě: {e}"

# --- Funkce pro grafické rozhraní ---
class App:
    def __init__(self, root):
        self.root = root
        self.root.title("JSON Merger by AI")
        self.root.geometry("500x250") # Šířka x výška

        self.input_folder_path = tk.StringVar()
        self.output_folder_path = tk.StringVar()
        self.output_filename = tk.StringVar(value="vysledny_soubor.json") # Výchozí název

        # --- Rozhraní pro výběr VSTUPNÍ složky ---
        frame_input = tk.Frame(root, pady=10)
        frame_input.pack(fill="x", padx=10)
        
        label_input = tk.Label(frame_input, text="Složka s JSON soubory:")
        label_input.pack(side="left")
        
        button_input = tk.Button(frame_input, text="Vybrat...", command=self.select_input_folder)
        button_input.pack(side="right")
        
        self.entry_input = tk.Entry(frame_input, textvariable=self.input_folder_path, state="readonly")
        self.entry_input.pack(side="left", fill="x", expand=True, padx=5)

        # --- Rozhraní pro výběr VÝSTUPNÍ složky a názvu souboru ---
        frame_output = tk.Frame(root, pady=5)
        frame_output.pack(fill="x", padx=10)
        
        label_output = tk.Label(frame_output, text="Výstupní složka:")
        label_output.pack(side="left")

        button_output = tk.Button(frame_output, text="Vybrat...", command=self.select_output_folder)
        button_output.pack(side="right")

        self.entry_output = tk.Entry(frame_output, textvariable=self.output_folder_path, state="readonly")
        self.entry_output.pack(side="left", fill="x", expand=True, padx=5)

        # --- Název výstupního souboru ---
        frame_filename = tk.Frame(root, pady=5)
        frame_filename.pack(fill="x", padx=10)

        label_filename = tk.Label(frame_filename, text="Název výstupního souboru:")
        label_filename.pack(side="left")
        
        entry_filename = tk.Entry(frame_filename, textvariable=self.output_filename)
        entry_filename.pack(side="left", fill="x", expand=True, padx=(18, 0))

        # --- Tlačítko pro spuštění ---
        self.run_button = tk.Button(root, text="Spojit soubory", command=self.run_merger, font=("Helvetica", 12, "bold"), bg="#4CAF50", fg="white")
        self.run_button.pack(pady=20, ipadx=10, ipady=5)

    def select_input_folder(self):
        folder_selected = filedialog.askdirectory()
        if folder_selected:
            self.input_folder_path.set(folder_selected)

    def select_output_folder(self):
        folder_selected = filedialog.askdirectory()
        if folder_selected:
            self.output_folder_path.set(folder_selected)

    def run_merger(self):
        input_dir = self.input_folder_path.get()
        output_dir = self.output_folder_path.get()
        filename = self.output_filename.get()

        if not input_dir or not output_dir or not filename:
            messagebox.showerror("Chyba", "Musíte vyplnit všechny pole!")
            return

        if not filename.endswith('.json'):
            filename += '.json'

        output_path = os.path.join(output_dir, filename)

        result = merge_json_files(input_dir, output_path)

        if isinstance(result, int):
            messagebox.showinfo("Hotovo", f"Úspěšně spojeno {result} souborů do:\n{output_path}")
        else:
            messagebox.showerror("Chyba při zpracování", result)

if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    root.mainloop()
