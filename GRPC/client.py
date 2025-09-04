import grpc
import konser_pb2
import konser_pb2_grpc

def register_user(stub):
    username = input("Masukkan username: ").strip()
    password = input("Masukkan password: ").strip()
    response = stub.RegisterUser(konser_pb2.User(username=username, password=password))
    print(response.pesan)

def login_user(stub):
    username = input("Masukkan username: ").strip()
    password = input("Masukkan password: ").strip()
    response = stub.LoginUser(konser_pb2.User(username=username, password=password))
    print(response.pesan)

def tambah_konser(stub):
    nama = input("Nama konser: ").strip()
    lokasi = input("Lokasi: ").strip()
    tanggal = input("Tanggal (yyyy-mm-dd): ").strip()
    jumlah = int(input("Jumlah tiket: "))
    response = stub.TambahKonser(konser_pb2.Konser(nama=nama, lokasi=lokasi, tanggal=tanggal, jumlah_tiket=jumlah))
    print(response.pesan)

def lihat_semua_konser(stub):
    print("Daftar Konser:")
    for konser in stub.LihatSemuaKonser(konser_pb2.Empty()):
        print(f"- {konser.nama} di {konser.lokasi} tanggal {konser.tanggal}, Tiket: {konser.jumlah_tiket}")

def edit_konser(stub):
    nama = input("Nama konser yang ingin diedit: ").strip()
    lokasi = input("Lokasi baru: ").strip()
    tanggal = input("Tanggal baru (yyyy-mm-dd): ").strip()
    jumlah = int(input("Jumlah tiket baru: "))
    response = stub.EditKonser(konser_pb2.Konser(nama=nama, lokasi=lokasi, tanggal=tanggal, jumlah_tiket=jumlah))
    print(response.pesan)

def hapus_konser(stub):
    nama = input("Nama konser yang ingin dihapus: ").strip()
    response = stub.HapusKonser(konser_pb2.KonserId(nama=nama))
    print(response.pesan)

def pesan_tiket(stub):
    konser_nama = input("Nama konser yang ingin dipesan: ").strip()
    jumlah = int(input("Jumlah tiket: "))
    response = stub.PesanTiket(konser_pb2.TiketRequest(konser_nama=konser_nama, jumlah=jumlah))
    print(f"{response.pesan}, Total: {response.total}")

def pesan_banyak(stub):
    def generate_requests():
        while True:
            nama = input("Nama konser (enter untuk selesai): ").strip()
            if not nama:
                break
            try:
                jumlah = int(input("Jumlah tiket: "))
            except ValueError:
                print("Jumlah harus angka.")
                continue
            yield konser_pb2.TiketRequest(konser_nama=nama, jumlah=jumlah)

    response = stub.PesanBanyak(generate_requests())
    print(f"[SERVER] {response.pesan}")

def live_chat(stub):
    username = input("Masukkan username Anda: ").strip()

    def generate_messages():
        print("Ketik pesan (atau 'exit' untuk keluar):")
        while True:
            pesan = input("> ")
            if pesan.lower() == 'exit':
                break
            yield konser_pb2.ChatMessage(user=username, pesan=pesan)

    responses = stub.LiveChat(generate_messages())
    print("Live chat dimulai...\n")
    try:
        for response in responses:
            print(f"[{response.user}]: {response.pesan}")
    except grpc.RpcError as e:
        print("Chat berakhir.")

def main():
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = konser_pb2_grpc.KonserServiceStub(channel)

        menu = {
            "1": ("Register", register_user),
            "2": ("Login", login_user),
            "3": ("Tambah Konser", tambah_konser),
            "4": ("Lihat Semua Konser", lihat_semua_konser),
            "5": ("Edit Konser", edit_konser),
            "6": ("Hapus Konser", hapus_konser),
            "7": ("Pesan Tiket", pesan_tiket),
            "8": ("Pesan Banyak Tiket (Client Streaming)", pesan_banyak),
            "9": ("Live Chat (Bi-directional Streaming)", live_chat),
            "0": ("Keluar", exit)
        }

        while True:
            print("\nMenu:")
            for key, (desc, _) in menu.items():
                print(f"{key}. {desc}")
            choice = input("Pilih opsi: ")

            if choice in menu:
                menu[choice][1](stub)
            else:
                print("Pilihan tidak valid.")

if __name__ == '__main__':
    main()
